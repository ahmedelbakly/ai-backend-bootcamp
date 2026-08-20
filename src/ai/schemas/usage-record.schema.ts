import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
@Schema({ timestamps: true })
export class UsageRecord {
  @Prop({ required: true })
  userId: string;

  @Prop({ required: true })
  model: string;

  @Prop({ required: true })
  service: string;

  @Prop({ required: true })
  inputTokens: number;

  @Prop({ required: true })
  outputTokens: number;

  @Prop({ required: true })
  totalTokens: number;

  @Prop({ required: true })
  cost: number;

  // Managed by `timestamps: true`, so deliberately left undecorated — declaring
  // them keeps SchemaFactory from adding duplicate paths while still letting
  // callers filter and sort on them with types intact.
  createdAt: Date;
  updatedAt: Date;
}

export const UsageRecordSchema = SchemaFactory.createForClass(UsageRecord);

// Every usage query scopes to one user and orders by recency; without this the
// reports degrade into a full collection scan as records accumulate.
UsageRecordSchema.index({ userId: 1, createdAt: -1 });
