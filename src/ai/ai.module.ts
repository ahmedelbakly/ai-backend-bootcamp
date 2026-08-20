import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import {
  COST_CALCULATOR,
  LLM_PROVIDER,
  OPENAI_CLIENT,
  OPENAI_MODEL,
} from './ai.tokens';
// import { OpenAIProvider } from './providers/openai.provider';
import { OpenAICostCalculatorService } from './services/openai-cost-calculator.service';
import { MockLLMProvider } from './providers/mock-llm.provider';
import { MongooseModule } from '@nestjs/mongoose';
import { UsageRecord, UsageRecordSchema } from './schemas/usage-record.schema';
import { AuthModule } from '../auth/auth.module';

const DEFAULT_MODEL = 'gpt-4o-mini';
const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_MAX_RETRIES = 2;

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: UsageRecord.name,
        schema: UsageRecordSchema,
      },
    ]),
    // Brings in the configured JwtService that JwtAuthGuard depends on.
    AuthModule,
  ],
  controllers: [AiController],
  providers: [
    AiService,
    {
      provide: OPENAI_CLIENT,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        new OpenAI({
          apiKey: config.getOrThrow<string>('OPENAI_API_KEY'),
          timeout: Number(
            config.get('OPENAI_TIMEOUT_MS') ?? DEFAULT_TIMEOUT_MS,
          ),
          maxRetries: Number(
            config.get('OPENAI_MAX_RETRIES') ?? DEFAULT_MAX_RETRIES,
          ),
        }),
    },
    {
      provide: OPENAI_MODEL,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        config.get<string>('OPENAI_MODEL') ?? DEFAULT_MODEL,
    },
    {
      provide: LLM_PROVIDER,
      useClass: MockLLMProvider,
    },
    {
      provide: COST_CALCULATOR,
      useClass: OpenAICostCalculatorService,
    },
  ],
})
export class AiModule {}
