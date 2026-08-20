export interface UsageTotals {
  requests: number;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  cost: number;
}

export interface DailyUsage extends UsageTotals {
  /** Calendar day in UTC, formatted YYYY-MM-DD. */
  date: string;
}

export interface ModelUsage extends UsageTotals {
  model: string;
}

export interface UsageSummary extends UsageTotals {
  byModel: ModelUsage[];
  firstRequestAt: Date | null;
  lastRequestAt: Date | null;
}

export interface PaginatedUsage<T> {
  items: T[];
  total: number;
  limit: number;
  skip: number;
}
