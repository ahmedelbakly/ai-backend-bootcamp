export interface LLMResponse {
  text: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}
