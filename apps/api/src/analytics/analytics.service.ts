import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class AnalyticsService {
    constructor(private prisma: PrismaService) { }

    async getStats() {
        const totalTasks = await this.prisma.task.count();
        const completedTasks = await this.prisma.task.count({ where: { status: 'DONE' } });
        const pendingTasks = await this.prisma.task.count({ where: { status: { not: 'DONE' } } });
        const highPriority = await this.prisma.task.count({
            where: {
                priority: 'P1',
                status: { not: 'DONE' }
            }
        });

        // Group by Type
        const byTypeRaw = await this.prisma.task.groupBy({
            by: ['type'],
            _count: {
                id: true
            }
        });

        const byType = byTypeRaw.reduce((acc, curr) => {
            acc[curr.type] = curr._count.id;
            return acc;
        }, {} as Record<string, number>);

        return {
            totalTasks,
            completedTasks,
            pendingTasks,
            highPriority,
            byType
        };
    }
}
