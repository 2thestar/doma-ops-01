
import { PrismaClient, SpaceType, SpaceStatus, UserRole, TaskPriority, TaskType, TaskStatus } from '@prisma/client';
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
}

const prisma = new PrismaClient({
    datasources: {
        db: {
            url: process.env.DATABASE_URL
        }
    }
});

async function main() {
    console.log('🌱 Starting Full Seeed...');

    // 1. Ensure Property & Zones (from seed_spaces)
    // We'll rely on seed_spaces.ts having run, or just find existing.
    // Ideally we merge them, but let's just lookup.
    let property = await prisma.property.findFirst();
    if (!property) {
        console.log('Creating Property...');
        property = await prisma.property.create({ data: { name: 'DOMA Portugal' } });
    }

    // Lookup Zones
    const zones = await prisma.zone.findMany({ where: { propertyId: property.id } });
    let zoneGlamping = zones.find(z => z.name.includes('Glamping'));
    if (!zoneGlamping) zoneGlamping = await prisma.zone.create({ data: { name: 'Glamping', propertyId: property.id } });

    // 2. Seed Users (Team)
    console.log('Creating Team...');
    const usersData = [
        { id: '550e8400-e29b-41d4-a716-446655440000', name: 'Maria Manager', email: 'maria@doma.inc', role: UserRole.MANAGER, department: 'HK' },
        { id: '550e8400-e29b-41d4-a716-446655440001', name: 'John Maintenance', email: 'john@doma.inc', role: UserRole.STAFF, department: 'MAINTENANCE' },
        { id: '550e8400-e29b-41d4-a716-446655440002', name: 'Sarah Housekeeper', email: 'sarah@doma.inc', role: UserRole.STAFF, department: 'HK' },
        { id: '550e8400-e29b-41d4-a716-446655440003', name: 'Reception Desk', email: 'front@doma.inc', role: UserRole.STAFF, department: 'FRONT_DESK' },
        { id: '550e8400-e29b-41d4-a716-446655440004', name: 'Chef Carlos', email: 'chef@doma.inc', role: UserRole.STAFF, department: 'FNB' },
        { id: '550e8400-e29b-41d4-a716-446655440005', name: 'Alice Therapist', email: 'alice@doma.inc', role: UserRole.STAFF, department: 'WELLNESS' },
        { id: '550e8400-e29b-41d4-a716-446655440006', name: 'Mike Maintenance Mgr', email: 'mike@doma.inc', role: UserRole.MANAGER, department: 'MAINTENANCE' },
    ];

    for (const u of usersData) {
        const exists = await prisma.user.findFirst({ where: { email: u.email } });
        if (!exists) {
            await prisma.user.create({
                data: {
                    id: u.id,
                    name: u.name,
                    email: u.email,
                    role: u.role,
                    department: u.department,
                    telegramId: null
                }
            });
            console.log(`Created User: ${u.name}`);
        }
    }

    const allUsers = await prisma.user.findMany();
    const maintenanceUser = allUsers.find(u => u.department === 'MAINTENANCE') || allUsers[0];
    const hkUser = allUsers.find(u => u.department === 'HK') || allUsers[0];
    const wellnessUser = allUsers.find(u => u.department === 'WELLNESS') || allUsers[0];

    // 3. Seed Equipment (Assets)
    console.log('Creating Assets...');
    // We need some spaces to put assets in.
    const spaces = await prisma.space.findMany();
    const publicArea = spaces.find(s => s.type === SpaceType.PUBLIC);
    const room = spaces.find(s => s.type === SpaceType.ROOM);

    const equipmentData = [
        { name: 'HVAC Unit 01', category: 'HVAC', serialNumber: 'HVAC-001', spaceId: room?.id },
        { name: 'Pool Pump A', category: 'Plumbing', serialNumber: 'PUMP-A', spaceId: publicArea?.id },
        { name: 'Service Cart 1', category: 'Furniture', serialNumber: 'CART-1', spaceId: publicArea?.id },
        { name: 'Main Generator', category: 'Electrical', serialNumber: 'GEN-X', spaceId: publicArea?.id },
    ];

    for (const eq of equipmentData) {
        if (!eq.spaceId) continue;
        const exists = await prisma.equipment.findFirst({ where: { serialNumber: eq.serialNumber } });
        if (!exists) {
            await prisma.equipment.create({
                data: {
                    name: eq.name,
                    category: eq.category,
                    serialNumber: eq.serialNumber || undefined,
                    spaceId: eq.spaceId
                }
            });
            console.log(`Created Asset: ${eq.name}`);
        }
    }

    // 4. Seed Tasks
    console.log('Creating Tasks...');
    const tasksData = [
        {
            title: 'Fix Leaking AC',
            type: TaskType.MAINTENANCE,
            priority: TaskPriority.P1,
            status: TaskStatus.ASSIGNED,
            spaceId: room?.id,
            assigneeId: maintenanceUser.id,
            description: 'Water dripping onto balcony.'
        },
        {
            title: 'Clean Room 101',
            type: TaskType.HK,
            priority: TaskPriority.P2,
            status: TaskStatus.NEW,
            spaceId: room?.id,
            assigneeId: null, // Unassigned
            description: 'Regular checkout cleaning.'
        },
        {
            title: 'Inspect Pool Filter',
            type: TaskType.INSPECTION,
            priority: TaskPriority.P3,
            status: TaskStatus.IN_PROGRESS,
            spaceId: publicArea?.id,
            assigneeId: maintenanceUser.id,
            description: 'Weekly check.'
        },
        {
            title: 'Guest Request: Extra Towels',
            type: TaskType.HK,
            priority: TaskPriority.P1,
            status: TaskStatus.NEW,
            spaceId: room?.id,
            assigneeId: hkUser.id,
            description: 'Guest in 101 needs 2 bath towels.'
        }
    ];

    for (const t of tasksData) {
        if (!t.spaceId) continue;
        await prisma.task.create({
            data: {
                title: t.title,
                type: t.type,
                priority: t.priority,
                status: t.status,
                spaceId: t.spaceId,
                assigneeId: t.assigneeId,
                description: t.description,
                isGuestImpact: t.priority === 'P1',
            }
        });
        console.log(`Created Task: ${t.title}`);
    }

    console.log('✅ Full Seed Complete!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
