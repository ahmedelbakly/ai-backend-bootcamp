import { Inject, Injectable } from '@nestjs/common';
import { COST_CALCULATOR, LLM_PROVIDER } from './ai.tokens';
import type { LLMProvider } from './interfaces/llm-provider.interface';
import type { LLMResponse } from './interfaces/llm-response.interface';
import type { CostCalculator } from './interfaces/cost-calculator.interface';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UsageRecord } from './schemas/usage-record.schema';

@Injectable()
export class AiService {
  constructor(
    @Inject(LLM_PROVIDER)
    private readonly llmProvider: LLMProvider,
    @Inject(COST_CALCULATOR)
    private readonly costCalculator: CostCalculator,
    @InjectModel(UsageRecord.name)
    private readonly usageRecordModel: Model<UsageRecord>,
  ) {}

  // userId is accepted but not consumed yet — it is what UsageRecord.userId
  // needs once usage tracking is wired up.
  async chatRequest(
    userId: string,
    message: string,
  ): Promise<LLMResponse & { cost: number }> {
    const response = await this.llmProvider.generate(message);
    const cost = this.costCalculator.calculateCost(
      response.inputTokens,
      response.outputTokens,
      response.model,
    );

    // add usage record to UsageRecord table
    const usageRecord = await this.usageRecordModel.create({
      userId,
      model: response.model,
      service: 'chat',
      inputTokens: response.inputTokens,
      outputTokens: response.outputTokens,
      totalTokens: response.totalTokens,
      cost,
    });

    return {
      ...response,
      cost,
    };
  }
}
