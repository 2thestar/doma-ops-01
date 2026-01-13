import { PrismaClient } from '@prisma/client';
import * as path from 'path';
import * as fs from 'fs';

// Force load .env from root manually
const envPath = path.join(process.cwd(), '../../.env');
console.log('Loading env from:', envPath);

if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const [key, ...rest] = trimmed.split('=');
        if (key && rest.length > 0) {
            let val = rest.join('=');
            if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
                val = val.slice(1, -1);
            }
            process.env[key.trim()] = val;
        }
    }
} else {
    console.error('Env file not found');
    process.exit(1);
}

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
    console.error('DATABASE_URL is undefined!');
    process.exit(1);
}
console.log('Connecting to DB at:', dbUrl.split('@')[1]); // Log host only for safety

const prisma = new PrismaClient({
    datasources: {
        db: {
            url: dbUrl
        }
    }
});

async function main() {
    const telegramId = '39637242';

    console.log(`Seeding user with Telegram ID: ${telegramId}...`);

    try {
        const existing = await prisma.user.findFirst({
            where: { telegramId },
        });

        if (existing) {
            console.log(`User already exists: ${existing.name} (${existing.role})`);
        } else {
            // Check if email taken
            const emailTaken = await prisma.user.findUnique({
                where: { email: 'boris@example.com' }
            });

            const email = emailTaken ? `boris.${Date.now()}@example.com` : 'boris@example.com';

            const user = await prisma.user.create({
                data: {
                    id: '550e8400-e29b-41d4-a716-446655440099',
                    name: 'Boris',
                    email: email,
                    telegramId: telegramId,
                    role: 'ADMIN',
                    department: 'HK'
                },
            });
            console.log(`✅ User created: ${user.name} (${user.role})`);
        }
    } catch (e) {
        console.error('ERROR SEEDING USER:', e);
        throw e;
    }
}

main()
    .catch((e) => {
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
