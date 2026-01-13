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

    // Auto-Assignment Logic
    let finalAssigneeId = assigneeId;

    if (!finalAssigneeId && rest.type) { // If no specific assignee, try to find one by Shift + Dept
      try {
        // Find candidates: On Shift, Matching Dept, Staff Role (prefer staff over managers)
        const candidates = await this.prisma.user.findMany({
          where: {
            // @ts-ignore // Prisma types might lag a bit on workspace
            isOnShift: true,
            // @ts-ignore 
            department: rest.type, // e.g. 'HK' or 'MAINTENANCE'
            role: 'STAFF'
          }
        });

        if (candidates.length > 0) {
          // Pick Random for now (Round Robin in v2)
          const random = candidates[Math.floor(Math.random() * candidates.length)];
          finalAssigneeId = random.id;
        } else {
          // Fallback: Try including Managers? Or leave unassigned. 
          // Requirement says "Assign to Team". 
          // If no one is on shift, it stays unassigned (Pool).
        }
      } catch (e) {
        console.warn('Auto-assignment failed', e);
      }
    }

    const task = await this.prisma.task.create({
      data: {
        ...rest,
        ...(spaceId ? { space: { connect: { id: spaceId } } } : {}),
        ...(finalAssigneeId ? { assignee: { connect: { id: finalAssigneeId } } } : {}),
        ...(reporterId ? { reporter: { connect: { id: reporterId } } } : {}),
        ...(equipmentId ? { equipment: { connect: { id: equipmentId } } } : {}),
        activityLogs: {
          create: {
            userId: actorId!, // We assume a user exists
            action: 'CREATED',
            metadata: { title: rest.title, autoAssigned: !!(!assigneeId && finalAssigneeId) }
          }
        }
      },
      include: { space: true, assignee: true }
    });

    // EFFECT: Update Space Status based on Task Type & Blocking
    if (spaceId) {
      if (rest.blockLocationUntil) {
        // Blocking Request -> OUT_OF_ORDER
        await this.prisma.space.update({
          where: { id: spaceId },
          data: { status: 'OUT_OF_ORDER' }
        }).catch(e => console.warn('Failed to set Space OUT_OF_ORDER', e));
      } else if (rest.type === 'HK') {
        // HK Task Created -> DIRTY (if not already worse, e.g. OOO)
        await this.prisma.space.update({
          where: { id: spaceId },
          data: { status: 'DIRTY' }
        }).catch(e => console.warn('Failed to set Space DIRTY', e));
      }
    }

    // Notify the final assignee (whether manual or auto)
    if (finalAssigneeId) {
      const spaceName = task.space?.name || 'Unknown Location';
      const msg = `🚨 *New Task Assigned*\n\n**${task.title}**\n📍 ${spaceName}\n🚦 ${task.priority}\n\nPlease update status when started.`;
      await this.botService.notifyUser(finalAssigneeId, msg);
    }

    return task;
  }



  async findAll(filters: { assigneeId?: string; reporterId?: string; reporterDepartment?: string } = {}) {
    // Build where clause
    const where: Prisma.TaskWhereInput = {};

    if (filters.assigneeId) {
      where.assigneeId = filters.assigneeId;
    }

    if (filters.reporterId) {
      where.reporterId = filters.reporterId;
    }

    if (filters.reporterDepartment) {
      // Filter tasks where the reporter belongs to the specified department
      where.reporter = {
        department: filters.reporterDepartment
      };
    }

    return this.prisma.task.findMany({
      where,
      include: {
        space: true,
        assignee: true,
        reporter: true, // Include reporter details
        equipment: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  findOne(id: string) {
    return this.prisma.task.findUnique({
      where: { id },
      include: {
        space: true,
        assignee: true,
        activityLogs: {
          include: {
            user: true
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    });
  }

  async update(id: string, updateTaskDto: UpdateTaskDto) {
    const { spaceId, assigneeId, reporterId, equipmentId, ...rest } = updateTaskDto;

    // Check if assignee is changing
    const oldTask = await this.prisma.task.findUnique({ where: { id }, include: { space: true } });

    let task;
    const updateData: any = {
      ...rest,
      ...(spaceId && { space: { connect: { id: spaceId } } }),
      ...(assigneeId && { assignee: { connect: { id: assigneeId } } }),
      ...(reporterId && { reporter: { connect: { id: reporterId } } }),
      ...(equipmentId && { equipment: { connect: { id: equipmentId } } }),
    };

    // Auto-populate timestamps
    if (rest.status === 'IN_PROGRESS') {
      updateData.startedAt = new Date();
    } else if (rest.status === 'DONE') {
      updateData.completedAt = new Date();
    }

    // Resolve Actor for Logs
    let actorId = 'system';
    const systemUser = await this.prisma.user.findFirst({ where: { role: 'ADMIN' } });
    if (systemUser) actorId = systemUser.id;
    // Fallback if no admin
    if (actorId === 'system') {
      const anyUser = await this.prisma.user.findFirst();
      if (anyUser) actorId = anyUser.id;
    }

    try {
      task = await this.prisma.task.update({
        where: { id },
        data: {
          ...updateData,
          activityLogs: {
            create: [
              // Log Assignment Changes
              ...(assigneeId && assigneeId !== oldTask?.assigneeId ? [{
                userId: actorId,
                action: oldTask?.assigneeId ? 'RE_ASSIGNED' : 'ASSIGNED',
                metadata: { oldAssignee: oldTask?.assigneeId, newAssignee: assigneeId }
              }] : []),
              // Log General Edits (if not just status change which is handled elsewhere)
              ...(!assigneeId && Object.keys(rest).length > 0 ? [{
                userId: actorId,
                action: 'EDITED',
                metadata: { fields: Object.keys(rest) }
              }] : [])
            ]
          }
        },
        include: { space: true }
      });
    } catch (error) {
      console.error('Prisma Update Failed:', error);
      throw error;
    }

    if (assigneeId && assigneeId !== oldTask?.assigneeId) {
      const spaceName = task.space?.name || 'Unknown Location';
      const msg = `👋 *Task Re-Assigned to You*\n\n**${task.title}**\n📍 ${spaceName}\n🚦 ${task.priority}`;
      await this.botService.notifyUser(assigneeId, msg);
    }

    // EFFECT: Update Space Status & Timestamps on Status Change
    if (rest.status) {
      const status = rest.status;

      // 1. Ready for Inspection -> READY
      if ((status as any) === 'READY_FOR_INSPECTION') {
        updateData.readyAt = new Date();
        if (task.type === 'HK' && task.spaceId) {
          await this.prisma.space.update({ where: { id: task.spaceId }, data: { status: 'READY' } })
            .catch(e => console.warn('Failed to set Space READY', e));
        }
      }

      // 2. Done (Inspector Pass) -> INSPECTED
      else if (status === 'DONE') {
        updateData.completedAt = new Date();
        // If this was an inspection pass (implied by DONE from Inspector Queue), set Space INSPECTED
        // Only for HK tasks that were likely inspected. 
        if (task.type === 'HK' && task.spaceId) {
          await this.prisma.space.update({ where: { id: task.spaceId }, data: { status: 'INSPECTED' } })
            .catch(e => console.warn('Failed to set Space INSPECTED', e));
        }
      }

      // 3. Reopened (Inspector Fail) -> DIRTY
      else if ((status as any) === 'REOPENED') {
        // Increment reopen count logic should be in the updateData directly if passed, or we do it here?
        // Prisma doesn't support { increment: 1 } inside a spread object easily if updateData is any.
        // But we can do:
        updateData.reopenCount = { increment: 1 };

        if (task.type === 'HK' && task.spaceId) {
          await this.prisma.space.update({ where: { id: task.spaceId }, data: { status: 'DIRTY' } })
            .catch(e => console.warn('Failed to set Space DIRTY', e));
        }
      }

      // 4. Started -> CLEANING
      else if (status === 'IN_PROGRESS' || status === 'ASSIGNED') {
        if (status === 'IN_PROGRESS') updateData.startedAt = new Date();
        if (task.type === 'HK' && task.spaceId) {
          await this.prisma.space.update({ where: { id: task.spaceId }, data: { status: 'CLEANING' } })
            .catch(e => console.warn('Failed to set Space CLEANING', e));
        }
      }
    }

    return task;
  }

  async updateStatus(id: string, status: TaskStatus, userId: string = 'system') {
    const task = await this.prisma.task.findUnique({ where: { id } });

    const updated = await this.prisma.task.update({
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

    // EFFECT: Update Space Status on Status Change (from updateStatus method)
    if (task && task.type === 'HK' && task.spaceId) {
      if (status === 'ASSIGNED' || status === 'IN_PROGRESS') {
        await this.prisma.space.update({
          where: { id: task.spaceId },
          data: { status: 'CLEANING' }
        }).catch(e => console.warn('Failed to auto-update space status', e));
      } else if (status === 'DONE') {
        await this.prisma.space.update({
          where: { id: task.spaceId },
          data: { status: 'READY' }
        }).catch(e => console.warn('Failed to auto-update space status', e));
      }
    }

    return updated;
  }

  async addComment(taskId: string, text: string, userId: string) {
    return this.prisma.activityLog.create({
      data: {
        taskId,
        userId,
        action: 'COMMENT',
        metadata: { text }
      },
      include: {
        user: true
      }
    });
  }

  remove(id: string) {
    return this.prisma.task.delete({ where: { id } });
  }
}
