import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, QueryFilter } from 'mongoose';
import { UsageRecord } from '../ai/schemas/usage-record.schema';
import { DateRangeQueryDto, UsageQueryDto } from './dto/usage-query.dto';
import {
  DailyUsage,
  ModelUsage,
  PaginatedUsage,
  UsageSummary,
  UsageTotals,
} from './interfaces/usage-report.interface';

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

// Costs are fractions of a cent, and summing floats produces noise like
// 0.00045000000000000004. Six places is well past the smallest per-request
// cost while keeping responses readable.
const COST_PRECISION = 6;

const roundCost = (cost: number): number =>
  Number((cost ?? 0).toFixed(COST_PRECISION));

/** Shape of a $group stage result before it is mapped to a public interface. */
interface GroupedTotals {
  _id: string | null;
  requests: number;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  cost: number;
}

interface SummaryTotals extends GroupedTotals {
  firstRequestAt: Date | null;
  lastRequestAt: Date | null;
}

const EMPTY_TOTALS: UsageTotals = {
  requests: 0,
  inputTokens: 0,
  outputTokens: 0,
  totalTokens: 0,
  cost: 0,
};

@Injectable()
export class UsageService {
  constructor(
    @InjectModel(UsageRecord.name)
    private readonly usageRecordModel: Model<UsageRecord>,
  ) {}

  async getUserUsage(
    userId: string,
    query: UsageQueryDto,
  ): Promise<PaginatedUsage<UsageRecord>> {
    const { limit = 20, skip = 0 } = query;
    const filter = this.buildFilter(userId, query);

    // Both run against the same filter, so they cannot disagree about what the
    // caller is paging through.
    const [items, total] = await Promise.all([
      this.usageRecordModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean<UsageRecord[]>()
        .exec(),
      this.usageRecordModel.countDocuments(filter).exec(),
    ]);

    return { items, total, limit, skip };
  }

  async getUserUsageByDate(
    userId: string,
    range: DateRangeQueryDto,
  ): Promise<DailyUsage[]> {
    const rows = await this.usageRecordModel
      .aggregate<GroupedTotals>([
        { $match: this.buildFilter(userId, range) },
        {
          $group: {
            // Grouping on the formatted string rather than on $dayOfYear keeps
            // the boundary explicit and survives ranges that span a year.
            _id: {
              $dateToString: {
                format: '%Y-%m-%d',
                date: '$createdAt',
                timezone: 'Africa/Cairo',
              },
            },
            ...this.sumStage(),
          },
        },
        { $sort: { _id: -1 } },
      ])
      .exec();

    return rows.map((row) => ({
      date: row._id as string,
      ...this.toTotals(row),
    }));
  }

  async getUserUsageSummary(
    userId: string,
    range: DateRangeQueryDto,
  ): Promise<UsageSummary> {
    const filter = this.buildFilter(userId, range);

    const [totals, byModel] = await Promise.all([
      this.usageRecordModel
        .aggregate<SummaryTotals>([
          { $match: filter },
          {
            $group: {
              _id: null,
              ...this.sumStage(),
              firstRequestAt: { $min: '$createdAt' },
              lastRequestAt: { $max: '$createdAt' },
            },
          },
        ])
        .exec(),
      this.usageRecordModel
        .aggregate<GroupedTotals>([
          { $match: filter },
          { $group: { _id: '$model', ...this.sumStage() } },
          { $sort: { cost: -1 } },
        ])
        .exec(),
    ]);

    // A user who has never called the AI gets zeroes rather than null — the
    // caller should not have to special-case an empty account.
    const grand = totals[0];

    return {
      ...(grand ? this.toTotals(grand) : EMPTY_TOTALS),
      firstRequestAt: grand?.firstRequestAt ?? null,
      lastRequestAt: grand?.lastRequestAt ?? null,
      byModel: byModel.map((row): ModelUsage => ({
        model: row._id as string,
        ...this.toTotals(row),
      })),
    };
  }

  /** The accumulator half of a $group stage, shared by all three aggregations. */
  private sumStage() {
    return {
      requests: { $sum: 1 },
      inputTokens: { $sum: '$inputTokens' },
      outputTokens: { $sum: '$outputTokens' },
      totalTokens: { $sum: '$totalTokens' },
      cost: { $sum: '$cost' },
    };
  }

  private toTotals(row: GroupedTotals): UsageTotals {
    return {
      requests: row.requests,
      inputTokens: row.inputTokens,
      outputTokens: row.outputTokens,
      totalTokens: row.totalTokens,
      cost: roundCost(row.cost),
    };
  }

  private buildFilter(
    userId: string,
    range: DateRangeQueryDto,
  ): QueryFilter<UsageRecord> {
    const { from, to } = range;

    // userId always comes from the verified token, never from the query string,
    // so one user can never read another's usage by guessing an id.
    const filter: QueryFilter<UsageRecord> = { userId };
    if (!from && !to) {
      return filter;
    }

    const createdAt: { $gte?: Date; $lte?: Date } = {};
    if (from) {
      createdAt.$gte = new Date(from);
    }
    if (to) {
      // A bare "2026-08-18" parses to midnight, which would exclude everything
      // that happened during that day — almost never what someone asking for a
      // range up to the 18th means. A full timestamp is honoured as written.
      const end = new Date(to);
      if (DATE_ONLY.test(to)) {
        end.setUTCHours(23, 59, 59, 999);
      }
      createdAt.$lte = end;
    }

    if (createdAt.$gte && createdAt.$lte && createdAt.$gte > createdAt.$lte) {
      throw new BadRequestException('`from` must not be after `to`');
    }

    return { ...filter, createdAt };
  }
}
