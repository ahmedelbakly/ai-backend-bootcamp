import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { UsageService } from './usage.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedRequest } from '../auth/interfaces/jwt-payload.interface';
import { DateRangeQueryDto, UsageQueryDto } from './dto/usage-query.dto';

// Usage is per-account data, so the whole controller is behind the guard and
// every handler reads its user id from the verified token. Nothing here accepts
// a userId parameter — that is what stops one user reading another's spend.
@UseGuards(JwtAuthGuard)
@Controller('usage')
export class UsageController {
  constructor(private readonly usageService: UsageService) {}

  @Get()
  getUserUsage(
    @Req() req: AuthenticatedRequest,
    @Query() query: UsageQueryDto,
  ) {
    return this.usageService.getUserUsage(req.user.sub, query);
  }

  // Declared before nothing dynamic, but kept explicit: 'by-date' and 'summary'
  // are static segments, so they never collide with the bare GET above.
  @Get('by-date')
  getUserUsageByDate(
    @Req() req: AuthenticatedRequest,
    @Query() range: DateRangeQueryDto,
  ) {
    return this.usageService.getUserUsageByDate(req.user.sub, range);
  }

  @Get('summary')
  getUserUsageSummary(
    @Req() req: AuthenticatedRequest,
    @Query() range: DateRangeQueryDto,
  ) {
    return this.usageService.getUserUsageSummary(req.user.sub, range);
  }
}
