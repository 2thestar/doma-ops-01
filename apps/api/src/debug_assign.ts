// @ts-nocheck
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🐞 Debug: Starting Assignment Test...');

    // 1. Find a valid Task (any NEW or ASSIGNED task)
    const task = await prisma.task.findFirst({
        include: { assignee: true }
    });

    if (!task) {
        console.error('❌ No tasks found!');
        return;
    }
    console.log(`Checking Task: ${task.title} (ID: ${task.id})`);

    // 2. Find John Maintenance
    const john = await prisma.user.findFirst({
        where: { name: { contains: 'Maintenance' } }
    });

    if (!john) {
        console.error('❌ User John Maintenance not found');
        return;
    }
    console.log(`Assigning to: ${john.name} (ID: ${john.id})`);

    // 3. Emulate the Service Logic directly (Copy-Paste from tasks.service.ts)
    // We want to fail exactly how the service fails

    // Resolve Actor for Logs
    let actorId = 'system';
    const systemUser = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
    if (systemUser) actorId = systemUser.id;
    if (actorId === 'system') {
        const anyUser = await prisma.user.findFirst();
        if (anyUser) actorId = anyUser.id;
    }
    console.log(`Resolved Actor ID: ${actorId}`);

    // Update Data payload
    const updateData = {
        assignee: { connect: { id: john.id } },
        status: 'ASSIGNED',
        activityLogs: {
            create: [
                {
                    userId: actorId,
                    action: 'ASSIGNED',
                    metadata: { oldAssignee: task.assigneeId, newAssignee: john.id }
                }
            ]
        }
    };

    console.log('Attempting Prisma Update...');
    try {
        const result = await prisma.task.update({
            where: { id: task.id },
            data: updateData
        });
        console.log('✅ Success!', result);
    } catch (e: any) {
        console.error('❌ FAILED!');
        console.error(e);
        if (e.meta) {
            console.error('Meta:', e.meta);
        }
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
