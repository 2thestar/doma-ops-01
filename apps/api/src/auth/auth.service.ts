import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../users/users.service';

@Injectable()
export class AuthService {
    constructor(private usersService: UsersService) { }

    async validateTelegramUser(telegramId: string) {
        const user = await this.usersService.findByTelegramId(telegramId);
        if (!user) {
            throw new UnauthorizedException('User not registered');
        }
        return user;
    }

    // Placeholder for Web Login logic
    async validateWebUser(email: string) {
        // TODO: Implement email/magic link auth
        return null;
    }
}
