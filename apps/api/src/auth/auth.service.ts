import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import * as crypto from 'crypto';

@Injectable()
export class AuthService {
    constructor(
        private usersService: UsersService,
        private configService: ConfigService
    ) { }

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
        return this.usersService.create({
            telegramId,
            name,
            role: 'PENDING'
        });
    }

    async linkUserByName(telegramId: string, name: string) {
        // 1. Find user by name (fuzzy or exact)
        // For MVP, exact match or case-insensitive match
        // We'll fetch all or use findFirst with insensitive mode if Prisma supports it (it does in Postgres)
        // Let's rely on usersService to find/update. 
        // We'll assume UsersService has access to Prisma.
        // Quickest way: 
        const users = await this.usersService.findAll(); // Optimization: implement findByName in UsersService later
        const match = users.find(u => u.name.toLowerCase() === name.toLowerCase());

        if (match && !match.telegramId) {
            // Link them!
            return this.usersService.update(match.id, { telegramId });
        }
        return null;
    }

    async validateTelegramMiniApp(initData: string): Promise<any> {
        const urlParams = new URLSearchParams(initData);
        const hash = urlParams.get('hash');
        urlParams.delete('hash');

        // Check for Dev Skip
        const isDev = this.configService.get('NODE_ENV') !== 'production';
        if (isDev && initData.includes('skip_validation=true')) {
            const mockId = urlParams.get('id') || 'MockUser';
            const user = await this.usersService.findByTelegramId(mockId); // or create dummy
            return user; // Simplified for dev
        }

        if (!hash) throw new UnauthorizedException('Hash missing');

        // Data-check-string is a chain of all received fields, sorted alphabetically
        const dataCheckString = Array.from(urlParams.entries())
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([key, val]) => `${key}=${val}`)
            .join('\n');

        // Secret key is the HMAC-SHA256 of the bot token
        const botToken = this.configService.get<string>('TELEGRAM_BOT_TOKEN');
        const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken!).digest();
        const calculatedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

        if (calculatedHash !== hash) {
            throw new UnauthorizedException('Invalid hash');
        }

        // Parse user data
        const userData = JSON.parse(urlParams.get('user') || '{}');
        if (!userData.id) throw new UnauthorizedException('User data missing');

        // Find or Create User
        // We trust this data now
        let user = await this.usersService.findByTelegramId(userData.id.toString());
        if (!user) {
            // Auto-register or Auto-link?
            // Let's try to link by username if possible, otherwise create PENDING
            user = await this.linkUserByName(userData.id.toString(), userData.first_name + ' ' + (userData.last_name || '')) ||
                await this.usersService.createFromTelegram({
                    telegramId: userData.id.toString(),
                    name: [userData.first_name, userData.last_name].filter(Boolean).join(' '),
                    username: userData.username
                });
        }

        return user;
    }
}
