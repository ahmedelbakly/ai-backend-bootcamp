import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import OpenAI from 'openai';
import { OPENAI_CLIENT, OPENAI_MODEL } from '../ai.tokens';
import { LLMProvider } from '../interfaces/llm-provider.interface';
import { LLMResponse } from '../interfaces/llm-response.interface';

@Injectable()
export class OpenAIProvider implements LLMProvider {
  private readonly logger = new Logger(OpenAIProvider.name);

  constructor(
    @Inject(OPENAI_CLIENT)
    private readonly openai: OpenAI,
    @Inject(OPENAI_MODEL)
    private readonly model: string,
  ) {}

  async generate(prompt: string): Promise<LLMResponse> {
    try {
      const response = await this.openai.responses.create({
        model: this.model,
        input: prompt,
      });

      const text = response.output_text?.trim();
      if (!text) {
        this.logger.error(
          `Model ${this.model} returned no text (status: ${response.status ?? 'unknown'})`,
        );
        throw new ServiceUnavailableException('The model returned no answer.');
      }
      if (!response.usage) {
        throw new BadRequestException('The model returned no usage info.');
      }

      return {
        text,
        model: this.model,
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
        totalTokens: response.usage.total_tokens,
      };
    } catch (error) {
      throw this.toHttpException(error);
    }
  }

  /**
   * Keeps provider internals (API keys, upstream payloads) out of the HTTP
   * response while still logging enough to debug the failure.
   */
  private toHttpException(error: unknown): HttpException {
    if (error instanceof HttpException) {
      return error;
    }

    if (error instanceof OpenAI.APIConnectionTimeoutError) {
      this.logger.error('OpenAI request timed out');
      return new HttpException(
        'The model took too long to respond.',
        HttpStatus.GATEWAY_TIMEOUT,
      );
    }

    if (error instanceof OpenAI.APIConnectionError) {
      this.logger.error(`Could not reach OpenAI: ${error.message}`);
      return new ServiceUnavailableException('The model is unreachable.');
    }

    if (error instanceof OpenAI.APIError) {
      const status = typeof error.status === 'number' ? error.status : 0;
      this.logger.error(`OpenAI API error ${status}: ${error.message}`);

      if (status === 401 || status === 403) {
        return new InternalServerErrorException(
          'The AI provider is not configured correctly.',
        );
      }
      if (status === 429) {
        // OpenAI reuses 429 for "out of credit", where retrying never helps.
        if (error.code === 'insufficient_quota') {
          return new ServiceUnavailableException(
            'The AI provider has no remaining quota.',
          );
        }
        return new HttpException(
          'The model is rate limited, try again shortly.',
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
      if (status === 400 || status === 404 || status === 422) {
        return new BadRequestException('The model rejected this request.');
      }
      return new ServiceUnavailableException('The model is unavailable.');
    }

    this.logger.error('Unexpected error while calling OpenAI', error);
    return new InternalServerErrorException('Failed to generate a response.');
  }
}
