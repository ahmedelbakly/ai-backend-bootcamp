import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsOptional, Max, Min } from 'class-validator';

// Kept as ISO strings rather than @Type(() => Date) on purpose: the service
// needs to see whether the caller wrote a bare date ("2026-08-18") or a full
// timestamp, so it can stretch a bare `to` to the end of that day. Converting
// here would throw that information away and silently exclude the final day.
export class DateRangeQueryDto {
  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}

export class UsageQueryDto extends DateRangeQueryDto {
  // @Type is required because query strings arrive as text; the global
  // ValidationPipe runs with transform: true, so this makes @IsInt meaningful.
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  skip?: number = 0;
}
