import { UserRole } from '@doma/shared';

export class CreateUserDto {
    name: string;
    telegramId?: string;
    email?: string;
    role?: UserRole;
}
