export interface UsageRecord {
  userId: string;
  model: string;
  service: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  cost: number;
  createdAt: Date;
}
