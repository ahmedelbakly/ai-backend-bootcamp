import { Test, TestingModule } from '@nestjs/testing';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedRequest } from '../auth/interfaces/jwt-payload.interface';

describe('AiController', () => {
  let controller: AiController;
  let aiService: { chatRequest: jest.Mock };

  const requestFor = (sub: string) =>
    ({ user: { sub, email: 'user@example.com' } }) as AuthenticatedRequest;

  beforeEach(async () => {
    aiService = { chatRequest: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AiController],
      providers: [{ provide: AiService, useValue: aiService }],
    })
      // Stubbed rather than provided: pulling in the real guard would drag
      // JwtService and its config into what is a unit test of the handler.
      // The guard's own behaviour is covered by the Postman auth folder.
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AiController>(AiController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('passes the body message to the service', async () => {
    aiService.chatRequest.mockResolvedValue('answer');

    await expect(
      controller.chat(requestFor('user-1'), { message: 'hello there' }),
    ).resolves.toBe('answer');
  });

  it('passes the authenticated user id, taken from the sub claim', async () => {
    aiService.chatRequest.mockResolvedValue('answer');

    await controller.chat(requestFor('user-1'), { message: 'hello there' });

    expect(aiService.chatRequest).toHaveBeenCalledWith('user-1', 'hello there');
  });
});
