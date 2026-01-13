import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🗑️  Starting Operations Reset...');

    // 1. Delete all ActivityLogs first (Foreign Key constraints)
    const deletedLogs = await prisma.activityLog.deleteMany({});
    console.log(`✅ Deleted ${deletedLogs.count} Activity Logs.`);

    // 2. Delete all Tasks
    const deletedTasks = await prisma.task.deleteMany({});
    console.log(`✅ Deleted ${deletedTasks.count} Tasks.`);

    // 3. Reset all Spaces to 'READY'
    const updatedSpaces = await prisma.space.updateMany({
        data: { status: 'READY' }
    });
    console.log(`✅ Reset ${updatedSpaces.count} Spaces to 'READY'.`);

    console.log('🏁 Operations Reset Complete.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
