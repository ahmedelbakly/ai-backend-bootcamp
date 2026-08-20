import { Test, TestingModule } from '@nestjs/testing';
import { UsageController } from './usage.controller';
import { UsageService } from './usage.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedRequest } from '../auth/interfaces/jwt-payload.interface';

describe('UsageController', () => {
  let controller: UsageController;
  let usageService: {
    getUserUsage: jest.Mock;
    getUserUsageByDate: jest.Mock;
    getUserUsageSummary: jest.Mock;
  };

  const requestFor = (sub: string) =>
    ({ user: { sub, email: 'user@example.com' } }) as AuthenticatedRequest;

  beforeEach(async () => {
    usageService = {
      getUserUsage: jest.fn(),
      getUserUsageByDate: jest.fn(),
      getUserUsageSummary: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsageController],
      providers: [{ provide: UsageService, useValue: usageService }],
    })
      // Stubbed rather than provided: pulling in the real guard would drag
      // JwtService and its config into what is a unit test of the handlers.
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<UsageController>(UsageController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // The point of all three: the user id comes from the token, so a caller
  // cannot widen the query to somebody else's records.
  it('reads the user id from the token for the record list', async () => {
    await controller.getUserUsage(requestFor('user-1'), { limit: 5, skip: 0 });

    expect(usageService.getUserUsage).toHaveBeenCalledWith('user-1', {
      limit: 5,
      skip: 0,
    });
  });

  it('reads the user id from the token for the daily rollup', async () => {
    await controller.getUserUsageByDate(requestFor('user-2'), {
      from: '2026-08-01',
    });

    expect(usageService.getUserUsageByDate).toHaveBeenCalledWith('user-2', {
      from: '2026-08-01',
    });
  });

  it('reads the user id from the token for the summary', async () => {
    await controller.getUserUsageSummary(requestFor('user-3'), {});

    expect(usageService.getUserUsageSummary).toHaveBeenCalledWith('user-3', {});
  });
});
