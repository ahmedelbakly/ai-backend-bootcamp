export interface CostCalculator {
  calculateCost(
    inputTokens: number,
    outputTokens: number,
    model: string,
  ): number;
}
