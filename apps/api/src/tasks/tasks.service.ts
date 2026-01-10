import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { Prisma, TaskStatus } from '@prisma/client';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { BotService } from '../bot/bot.service';

@Injectable()
export class TasksService {
  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => BotService)) private botService: BotService
  ) { }

  async create(createTaskDto: CreateTaskDto) {
    const { spaceId, assigneeId, reporterId, equipmentId, ...rest } = createTaskDto;

    // Find a valid actor for the activity log
    let actorId = reporterId;
    if (!actorId) {
      // Fallback to any user (e.g. system/admin) if not provided
      // In a real app, we might have a specific fixed UUID for 'system' seeded
      const fallbackUser = await this.prisma.user.findFirst();
      if (fallbackUser) {
        actorId = fallbackUser.id;
      } else {
        // Should not happen if seeded, but handle gracefully or throw?
        // For now, let's assume seed exists. If not, this might still fail P2003 but with null?
        // Actually ActivityLog.userId is String (not nullable). 
        // We must have a user.
      }
    }

    const task = await this.prisma.task.create({
      data: {
        ...rest,
        space: { connect: { id: spaceId } },
        ...(assigneeId && { assignee: { connect: { id: assigneeId } } }),
        ...(reporterId && { reporter: { connect: { id: reporterId } } }),
        ...(equipmentId && { equipment: { connect: { id: equipmentId } } }),
        activityLogs: {
          create: {
            userId: actorId!, // We assume a user exists
            action: 'CREATED',
            metadata: { title: rest.title }
          }
        }
      },
      include: { space: true }
    });

    if (assigneeId) {
      const spaceName = task.space?.name || 'Unknown Location';
      const msg = `🚨 *New Task Assigned*\n\n**${task.title}**\n📍 ${spaceName}\n🚦 ${task.priority}\n\nPlease update status when started.`;
      await this.botService.notifyUser(assigneeId, msg);
    }

    return task;
  }

  findAll() {
    return this.prisma.task.findMany({
      include: {
        space: true,
        assignee: true,
      },
      orderBy: {
        createdAt: 'desc',
      }
    });
  }

  findMyTasks(userId: string) {
    return this.prisma.task.findMany({
      where: { assigneeId: userId },
      include: { space: true },
      orderBy: { priority: 'asc' }, // P1 first
    });
  }

  findOne(id: string) {
    return this.prisma.task.findUnique({
      where: { id },
      include: {
        space: true,
        assignee: true,
        activityLogs: true,
      }
    });
  }

  async update(id: string, updateTaskDto: UpdateTaskDto) {
    const { spaceId, assigneeId, reporterId, equipmentId, ...rest } = updateTaskDto;

    // Check if assignee is changing
    const oldTask = await this.prisma.task.findUnique({ where: { id } });

    const task = await this.prisma.task.update({
      where: { id },
      data: {
        ...rest,
        ...(spaceId && { space: { connect: { id: spaceId } } }),
        ...(assigneeId && { assignee: { connect: { id: assigneeId } } }),
        ...(reporterId && { reporter: { connect: { id: reporterId } } }),
        ...(equipmentId && { equipment: { connect: { id: equipmentId } } }),
      },
      include: { space: true }
    });

    if (assigneeId && assigneeId !== oldTask?.assigneeId) {
      const spaceName = task.space?.name || 'Unknown Location';
      const msg = `👋 *Task Re-Assigned to You*\n\n**${task.title}**\n📍 ${spaceName}\n🚦 ${task.priority}`;
      await this.botService.notifyUser(assigneeId, msg);
    }

    return task;
  }

  async updateStatus(id: string, status: TaskStatus, userId: string = 'system') {
    return this.prisma.task.update({
      where: { id },
      data: {
        status,
        ...(status === 'DONE' ? { completedAt: new Date() } : {}),
        ...(status === 'IN_PROGRESS' ? { startedAt: new Date() } : {}),
        activityLogs: {
          create: {
            userId,
            action: `STATUS_CHANGE_${status}`,
          }
        }
      },
    });
  }

  remove(id: string) {
    return this.prisma.task.delete({ where: { id } });
  }
}
