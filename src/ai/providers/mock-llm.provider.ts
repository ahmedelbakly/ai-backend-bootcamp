import { Injectable } from '@nestjs/common';
import { LLMProvider } from '../interfaces/llm-provider.interface';
import { LLMResponse } from '../interfaces/llm-response.interface';

@Injectable()
export class MockLLMProvider implements LLMProvider {
  async generate(prompt: string): Promise<LLMResponse> {
    return {
      text: prompt,
      model: 'gpt-4o-mini',
      inputTokens: 1000,
      outputTokens: 500,
      totalTokens: 1500,
    };
  }
}
