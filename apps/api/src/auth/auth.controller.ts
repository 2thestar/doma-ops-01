import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  @Post('telegram-miniapp')
  async telegramMiniAppLogin(@Body('initData') initData: string) {
    const user = await this.authService.validateTelegramMiniApp(initData);
    // Return user info (and ideally a JWT token for session)
    // For MVP, if we use just user object, frontend stores it.
    // Ideally we should sign a JWT here. 
    // But let's return the user for now.
    return { status: 'success', user };
  }
}
