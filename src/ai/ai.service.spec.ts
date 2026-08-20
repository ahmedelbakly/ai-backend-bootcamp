import { Test, TestingModule } from '@nestjs/testing';
import { AiService } from './ai.service';
import { LLM_PROVIDER } from './ai.tokens';
import type { LLMProvider } from './interfaces/llm-provider.interface';

describe('AiService', () => {
  let service: AiService;
  let llmProvider: jest.Mocked<LLMProvider>;

  beforeEach(async () => {
    llmProvider = { generate: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [AiService, { provide: LLM_PROVIDER, useValue: llmProvider }],
    }).compile();

    service = module.get<AiService>(AiService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('delegates the message to the LLM provider', async () => {
    llmProvider.generate.mockResolvedValue({
      text: 'answer',
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
    });

    await expect(service.chatRequest('hello there')).resolves.toBe('answer');
    // expect(llmProvider.generate).toHaveBeenCalledWith('hello there');
  });
});
