import { PrismaClient, SpaceType, SpaceStatus } from '@prisma/client';
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
    console.log('🌱 Seeding Spaces...');

    // 1. Create Property
    const property = await prisma.property.create({
        data: {
            name: 'DOMA Portugal',
        }
    });

    // 2. Create Zones
    const zoneGlamping = await prisma.zone.create({ data: { name: 'Glamping', propertyId: property.id } });
    const zoneHistoric0 = await prisma.zone.create({ data: { name: 'Historic Rooms (Floor 0)', propertyId: property.id } });
    const zoneHistoric1 = await prisma.zone.create({ data: { name: 'Historic Rooms (Floor 1)', propertyId: property.id } });
    const zonePublic = await prisma.zone.create({ data: { name: 'Public Areas', propertyId: property.id } });
    const zoneDouble = await prisma.zone.create({ data: { name: 'Double Rooms', propertyId: property.id } });

    // 3. Helper to create space
    const createSpace = async (name: string, zoneId: string, type: SpaceType, status: SpaceStatus = SpaceStatus.DIRTY) => {
        await prisma.space.create({
            data: {
                name,
                zoneId,
                type,
                status
            }
        });
    };

    // --- Glamping ---
    const glampingRooms = [
        'T10T Glamping GLP', 'T11T Glamping GLP', 'T12T Glamping GLP', 'T13T Glamping GLP',
        'T14T Glamping GLP', 'T15T Glamping GLP', 'T1D Glamping GLP', 'T2D Glamping GLP'
    ];
    for (const name of glampingRooms) await createSpace(name, zoneGlamping.id, SpaceType.ROOM, SpaceStatus.OUT_OF_ORDER);

    // --- Historic Floor 0 ---
    const historic0 = [
        '00014 Historic Deluxe Room TWIN HDX', '00015 Historic Deluxe Room TWIN HDX',
        '00016 Historic Deluxe Room DOUBLE HDX', '00017 Historic Deluxe Room DOUBLE HDX',
        '00018 Historic Deluxe Room TWIN HDX', '00019 Historic Deluxe Room TWIN HDX',
    ];
    for (const name of historic0) await createSpace(name, zoneHistoric0.id, SpaceType.ROOM, SpaceStatus.CLEANING);

    // --- Historic Floor 1 ---
    const historic1 = [
        '00024 Historic Double HD', '00025 Historic Double HD', '00026 Historic Double HD',
        '00027 Historic Double HD', '00028 Historic Double HD'
    ];
    for (const name of historic1) await createSpace(name, zoneHistoric1.id, SpaceType.ROOM, SpaceStatus.OUT_OF_ORDER);

    // --- Double Rooms ---
    const doubles = [
        '00001 Double TWIN Room DB', '00002 Double Room DB', '00003 Double Room DB',
        '00007 Double With Bathtub DB', '00008 Double With Bathtub DB'
    ];
    for (const name of doubles) await createSpace(name, zoneDouble.id, SpaceType.ROOM, SpaceStatus.DIRTY);


    // --- Public Areas (From Screenshot + Request) ---
    const publicAreas = [
        'ATMOS Lounge', 'Banquet hall', 'Winter Garden', 'Forest terrace', // Requested
        'Arraial A', 'Bakery B', 'Co-Working Space CS', 'Garden Area GA',
        'Lagar Lagar', 'Main Hall', 'Steam Center Lounge SC', 'Wood Terrace WT' // From Screenshot
    ];
    for (const name of publicAreas) await createSpace(name, zonePublic.id, SpaceType.PUBLIC, SpaceStatus.DIRTY);

    console.log('✅ Seeding Complete!');
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
