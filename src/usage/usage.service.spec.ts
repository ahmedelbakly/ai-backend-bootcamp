import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { BadRequestException } from '@nestjs/common';
import { UsageService } from './usage.service';
import { UsageRecord } from '../ai/schemas/usage-record.schema';

// find() is a builder, so the mock has to return itself until .exec().
const findChain = (result: unknown) => {
  const chain: Record<string, jest.Mock> = {};
  for (const method of ['sort', 'skip', 'limit', 'lean']) {
    chain[method] = jest.fn(() => chain);
  }
  chain.exec = jest.fn().mockResolvedValue(result);
  return chain;
};

const execOf = (result: unknown) => ({
  exec: jest.fn().mockResolvedValue(result),
});

/** What buildFilter is expected to hand to find()/countDocuments(). */
interface UsageFilter {
  userId: string;
  createdAt?: { $gte?: Date; $lte?: Date };
}

describe('UsageService', () => {
  let service: UsageService;
  // Typed argument lists so assertions on mock.calls stay type-safe instead of
  // reaching through `any`.
  let model: {
    find: jest.Mock<unknown, [UsageFilter]>;
    countDocuments: jest.Mock<unknown, [UsageFilter]>;
    aggregate: jest.Mock;
  };

  const createdAtOf = (call = 0) => {
    const { createdAt } = model.find.mock.calls[call][0];
    if (!createdAt) {
      throw new Error('expected the query to carry a date filter');
    }
    return createdAt;
  };

  beforeEach(async () => {
    model = {
      find: jest.fn<unknown, [UsageFilter]>().mockReturnValue(findChain([])),
      countDocuments: jest
        .fn<unknown, [UsageFilter]>()
        .mockReturnValue(execOf(0)),
      aggregate: jest.fn().mockReturnValue(execOf([])),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsageService,
        { provide: getModelToken(UsageRecord.name), useValue: model },
      ],
    }).compile();

    service = module.get<UsageService>(UsageService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getUserUsage', () => {
    it('scopes the query to the caller and returns paging metadata', async () => {
      model.find.mockReturnValue(findChain([{ cost: 1 }]));
      model.countDocuments.mockReturnValue(execOf(42));

      const result = await service.getUserUsage('user-1', {
        limit: 10,
        skip: 20,
      });

      expect(model.find).toHaveBeenCalledWith({ userId: 'user-1' });
      expect(result).toEqual({
        items: [{ cost: 1 }],
        total: 42,
        limit: 10,
        skip: 20,
      });
    });

    it('counts against the same filter it lists with', async () => {
      await service.getUserUsage('user-1', { from: '2026-08-01' });

      expect(model.countDocuments).toHaveBeenCalledWith(
        model.find.mock.calls[0][0],
      );
    });

    it('stretches a bare `to` date to the end of that day', async () => {
      await service.getUserUsage('user-1', { to: '2026-08-18' });

      expect(createdAtOf().$lte?.toISOString()).toBe(
        '2026-08-18T23:59:59.999Z',
      );
    });

    it('honours an explicit timestamp in `to` as written', async () => {
      await service.getUserUsage('user-1', { to: '2026-08-18T06:00:00.000Z' });

      expect(createdAtOf().$lte?.toISOString()).toBe(
        '2026-08-18T06:00:00.000Z',
      );
    });

    it('rejects a range that runs backwards', async () => {
      await expect(
        service.getUserUsage('user-1', {
          from: '2026-08-18',
          to: '2026-08-01',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('omits the date filter entirely when no range is given', async () => {
      await service.getUserUsage('user-1', {});

      expect(model.find).toHaveBeenCalledWith({ userId: 'user-1' });
    });
  });

  describe('getUserUsageByDate', () => {
    it('maps the grouping key to a date field', async () => {
      model.aggregate.mockReturnValue(
        execOf([
          {
            _id: '2026-08-18',
            requests: 2,
            inputTokens: 10,
            outputTokens: 5,
            totalTokens: 15,
            cost: 0.00045000000000000004,
          },
        ]),
      );

      await expect(service.getUserUsageByDate('user-1', {})).resolves.toEqual([
        {
          date: '2026-08-18',
          requests: 2,
          inputTokens: 10,
          outputTokens: 5,
          totalTokens: 15,
          cost: 0.00045,
        },
      ]);
    });
  });

  describe('getUserUsageSummary', () => {
    it('returns zeroes rather than null for an account with no usage', async () => {
      await expect(service.getUserUsageSummary('user-1', {})).resolves.toEqual({
        requests: 0,
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
        cost: 0,
        byModel: [],
        firstRequestAt: null,
        lastRequestAt: null,
      });
    });

    it('rounds away float noise and breaks the spend down per model', async () => {
      const first = new Date('2026-08-01T00:00:00.000Z');
      const last = new Date('2026-08-18T00:00:00.000Z');

      model.aggregate
        .mockReturnValueOnce(
          execOf([
            {
              _id: null,
              requests: 3,
              inputTokens: 30,
              outputTokens: 15,
              totalTokens: 45,
              cost: 0.30000000000000004,
              firstRequestAt: first,
              lastRequestAt: last,
            },
          ]),
        )
        .mockReturnValueOnce(
          execOf([
            {
              _id: 'gpt-4o-mini',
              requests: 3,
              inputTokens: 30,
              outputTokens: 15,
              totalTokens: 45,
              cost: 0.30000000000000004,
            },
          ]),
        );

      const summary = await service.getUserUsageSummary('user-1', {});

      expect(summary.cost).toBe(0.3);
      expect(summary.firstRequestAt).toBe(first);
      expect(summary.lastRequestAt).toBe(last);
      expect(summary.byModel).toEqual([
        {
          model: 'gpt-4o-mini',
          requests: 3,
          inputTokens: 30,
          outputTokens: 15,
          totalTokens: 45,
          cost: 0.3,
        },
      ]);
    });
  });
});
