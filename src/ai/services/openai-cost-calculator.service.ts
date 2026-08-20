import { BadRequestException, Injectable } from '@nestjs/common';
import { OPENAI_MODEL_PRICING } from '../config/model-pricing';
import type { CostCalculator } from '../interfaces/cost-calculator.interface';

@Injectable()
export class OpenAICostCalculatorService implements CostCalculator {
  calculateCost(
    inputTokens: number,
    outputTokens: number,
    model: string,
  ): number {
    const modelPricing = OPENAI_MODEL_PRICING[model];

    if (!modelPricing) {
      throw new BadRequestException(
        `Unsupported model for cost calculation: ${model}`,
      );
    }

    const inputCost = (inputTokens * modelPricing.inputPerMillion) / 1_000_000;

    const outputCost =
      (outputTokens * modelPricing.outputPerMillion) / 1_000_000;

    return inputCost + outputCost;
  }
}
