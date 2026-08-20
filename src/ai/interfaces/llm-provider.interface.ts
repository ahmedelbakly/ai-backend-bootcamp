import type { LLMResponse } from './llm-response.interface';

export interface LLMProvider {
  generate(prompt: string): Promise<LLMResponse>;
}
