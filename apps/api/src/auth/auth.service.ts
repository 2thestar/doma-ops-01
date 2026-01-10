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

    async validateTelegramUserByInternalId(id: string) {
        return this.usersService.findOne(id);
    }

    // Placeholder for Web Login logic
    async validateWebUser(email: string) {
        // TODO: Implement email/magic link auth
        return null;
    }

    async registerPendingUser(telegramId: string, name: string) {
        // Use createUser from usersService (we need to make sure it handles the mapped role)
        // NOTE: usersService.create needs to support setting role, or we default to PENDING in logic.
        // Assuming update UsersService or use prisma directly? 
        // Let's defer to UsersService. 
        // Actually, let's just do it via usersService.
        return this.usersService.create({
            telegramId,
            name,
            role: 'PENDING'
        });
    }
}
