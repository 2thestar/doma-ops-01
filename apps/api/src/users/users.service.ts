import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { UserRole } from '@doma/shared';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) { }

  async create(createUserDto: CreateUserDto) {
    return this.prisma.user.create({
      data: {
        name: createUserDto.name,
        email: createUserDto.email,
        telegramId: createUserDto.telegramId,
        role: (createUserDto.role as any) === 'SUPERVISOR' ? 'MANAGER' : (createUserDto.role || 'STAFF') as any,
      }
    });
  }

  findAll() {
    return this.prisma.user.findMany();
  }

  findOne(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  update(id: string, updateUserDto: UpdateUserDto) {
    return this.prisma.user.update({
      where: { id },
      data: updateUserDto as any,
    });
  }

  remove(id: string) {
    return this.prisma.user.delete({ where: { id } });
  }

  // Telegram Specific Methods
  async findByTelegramId(telegramId: string) {
    return this.prisma.user.findUnique({
      where: { telegramId },
    });
  }

  async createFromTelegram(data: { telegramId: string; name: string; username?: string }) {
    return this.prisma.user.create({
      data: {
        telegramId: data.telegramId,
        name: data.name,
        role: 'STAFF',
      },
    });
  }

  async setRole(userId: string, role: UserRole) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { role: role as any },
    });
  }

  async updateShift(userId: string, isOnShift: boolean) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { isOnShift: isOnShift as any },
    });
  }
}
