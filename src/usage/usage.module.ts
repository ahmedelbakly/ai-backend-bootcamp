import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UsageController } from './usage.controller';
import { UsageService } from './usage.service';
import {
  UsageRecord,
  UsageRecordSchema,
} from '../ai/schemas/usage-record.schema';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    // The same collection AiService writes to. Registering it here as well is
    // how this module gets its own injectable model — AiModule's registration
    // is scoped to AiModule.
    MongooseModule.forFeature([
      { name: UsageRecord.name, schema: UsageRecordSchema },
    ]),
    // Brings in the configured JwtService that JwtAuthGuard depends on.
    AuthModule,
  ],
  controllers: [UsageController],
  providers: [UsageService],
  exports: [UsageService],
})
export class UsageModule {}
