import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { ChatDto } from './dto/chat.dto';
import { AiService } from './ai.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedRequest } from '../auth/interfaces/jwt-payload.interface';

// Guarded at the controller, not the handler, so routes added here later are
// protected by default rather than by remembering to decorate each one.
@UseGuards(JwtAuthGuard)
@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('chat')
  chat(@Req() req: AuthenticatedRequest, @Body() body: ChatDto) {
    // `sub` — the standard JWT claim for the subject — is where AuthService
    // signs the user id. The payload has no `id` field.
    return this.aiService.chatRequest(req.user.sub, body.message);
  }
}
