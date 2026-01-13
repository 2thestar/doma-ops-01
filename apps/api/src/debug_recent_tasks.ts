import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Fetching last 5 tasks...');
    const tasks = await prisma.task.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
            reporter: true,
            assignee: true,
        }
    });

    console.log('--- Recent Tasks ---');
    tasks.forEach(t => {
        console.log(`ID: ${t.id}`);
        console.log(`Title: ${t.title}`);
        console.log(`Type: ${t.type}`);
        console.log(`Reporter: ${t.reporterId} (${t.reporter?.name || 'N/A'})`);
        console.log(`Reporter Dept: ${t.reporter?.department}`);
        console.log(`Created At: ${t.createdAt}`);
        console.log('-------------------');
    });
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
