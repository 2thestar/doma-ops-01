import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { PrismaService } from './prisma.service';
import { exec } from 'child_process';
import { UserRole } from '@doma/shared';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly prisma: PrismaService,
  ) { }

  // ... (methods) ...

  @Get('seed-users')
  async seedUsers() {
    const users: { name: string, role: UserRole, telegramId: string | null }[] = [
      { name: 'Boris', role: UserRole.MANAGER, telegramId: null },
      { name: 'Rita', role: UserRole.MANAGER, telegramId: null },
      { name: 'Andreia Vasconcelos', role: UserRole.STAFF, telegramId: null },
      { name: 'Kleiton Santos', role: UserRole.STAFF, telegramId: null },
      { name: 'Luci Pereira', role: UserRole.STAFF, telegramId: null },
      { name: 'Fleur van Heusde', role: UserRole.STAFF, telegramId: null },
      { name: 'Esther Vargas', role: UserRole.STAFF, telegramId: null },
      { name: 'Marilia Barbosa', role: UserRole.STAFF, telegramId: null },
      { name: 'Tiago Matias', role: UserRole.MAINTENANCE, telegramId: null },
      { name: 'Diogo Branquinho', role: UserRole.STAFF, telegramId: null },
      { name: 'Damiane Rocha', role: UserRole.STAFF, telegramId: null },
      { name: 'Carlota Da Graça', role: UserRole.STAFF, telegramId: null },
    ];

    let count = 0;
    for (const user of users) {
      // Upsert: Create if new, Update if exists (to ensure role is correct)
      await this.prisma.user.upsert({
        where: { name: user.name },
        update: { role: user.role, telegramId: user.telegramId },
        create: { name: user.name, role: user.role, telegramId: user.telegramId },
      });
      count++;
    }

    return { status: 'SUCCESS', message: `Seeded ${count} users!` };
  }

  @Get('seed-spaces')
  async seedSpaces() {
    // 1. Ensure Property
    const property = await this.prisma.property.upsert({
      where: { id: 'doma-hotel' },
      update: {},
      create: { id: 'doma-hotel', name: 'DOMA Hotel Portugal' },
    });

    // 2. Create Zones
    const zonesData = [
      { id: 'zone-glamping', name: 'Glamping (Outdoor)', propertyId: property.id },
      { id: 'zone-historic', name: 'Historic Wing (0 Floor)', propertyId: property.id },
      { id: 'zone-main', name: 'Main Building (1 Floor)', propertyId: property.id },
      { id: 'zone-public', name: 'Public Areas', propertyId: property.id },
    ];

    for (const z of zonesData) {
      await this.prisma.zone.upsert({ where: { id: z.id }, update: {}, create: z });
    }

    // 3. Define Rooms (From Screenshots)
    const rooms = [
      // Glamping (All Out of Order)
      { name: 'T10T Glamping GLP', type: 'OUTDOOR', status: 'OUT_OF_ORDER', zoneId: 'zone-glamping' },
      { name: 'T11T Glamping GLP', type: 'OUTDOOR', status: 'OUT_OF_ORDER', zoneId: 'zone-glamping' },
      { name: 'T12T Glamping GLP', type: 'OUTDOOR', status: 'OUT_OF_ORDER', zoneId: 'zone-glamping' },
      { name: 'T13T Glamping GLP', type: 'OUTDOOR', status: 'OUT_OF_ORDER', zoneId: 'zone-glamping' },
      { name: 'T14T Glamping GLP', type: 'OUTDOOR', status: 'OUT_OF_ORDER', zoneId: 'zone-glamping' },
      { name: 'T15T Glamping GLP', type: 'OUTDOOR', status: 'OUT_OF_ORDER', zoneId: 'zone-glamping' },

      // Historic Wing (0 Floor)
      { name: '00014 Historic Deluxe Room TWIN HDX', type: 'ROOM', status: 'READY', zoneId: 'zone-historic' },
      { name: '00015 Historic Deluxe Room TWIN HDX', type: 'ROOM', status: 'READY', zoneId: 'zone-historic' },
      { name: '00016 Historic Deluxe Room DOUBLE HDX', type: 'ROOM', status: 'READY', zoneId: 'zone-historic' },
      { name: '00017 Historic Deluxe Room DOUBLE HDX', type: 'ROOM', status: 'READY', zoneId: 'zone-historic' },
      { name: '00018 Historic Deluxe Room TWIN HDX', type: 'ROOM', status: 'READY', zoneId: 'zone-historic' },
      { name: '00024 Historic Double HD', type: 'ROOM', status: 'OUT_OF_ORDER', zoneId: 'zone-historic' },
      { name: '00025 Historic Double HD', type: 'ROOM', status: 'OUT_OF_ORDER', zoneId: 'zone-historic' },
      { name: '00026 Historic Double HD', type: 'ROOM', status: 'OUT_OF_ORDER', zoneId: 'zone-historic' },

      // Main Building (1 Floor)
      { name: '00001 Double TWIN Room DB', type: 'ROOM', status: 'READY', zoneId: 'zone-main' },
      { name: '00002 Double Room DB', type: 'ROOM', status: 'READY', zoneId: 'zone-main' },
      { name: '00003 Double Room DB', type: 'ROOM', status: 'READY', zoneId: 'zone-main' },
      { name: '00004 Double Room DB', type: 'ROOM', status: 'READY', zoneId: 'zone-main' },
      { name: '00007 Double With Bathtub DB', type: 'ROOM', status: 'READY', zoneId: 'zone-main' },
      { name: '00008 Double With Bathtub DB', type: 'ROOM', status: 'DIRTY', zoneId: 'zone-main' },
      { name: '00009 Double With Bathtub DB', type: 'ROOM', status: 'READY', zoneId: 'zone-main' },
      { name: '00032 Historic Double HD', type: 'ROOM', status: 'INSPECTED', zoneId: 'zone-main' },
      { name: '00033 Historic Double HD', type: 'ROOM', status: 'INSPECTED', zoneId: 'zone-main' },
      { name: '00034 Historic Double HD', type: 'ROOM', status: 'READY', zoneId: 'zone-main' },
      { name: '00035 Historic Double HD', type: 'ROOM', status: 'DIRTY', zoneId: 'zone-main' },
      { name: '00036 Family Room FS', type: 'ROOM', status: 'READY', zoneId: 'zone-main' },

      // Public Areas
      { name: 'Arraial A', type: 'PUBLIC', status: 'DIRTY', zoneId: 'zone-public' },
      { name: 'Bakery B', type: 'PUBLIC', status: 'DIRTY', zoneId: 'zone-public' },
      { name: 'Steam Center Lounge SC', type: 'PUBLIC', status: 'DIRTY', zoneId: 'zone-public' },
    ];

    let count = 0;
    for (const room of rooms) {
      const exists = await this.prisma.space.findFirst({ where: { name: room.name } });
      if (!exists) {
        await this.prisma.space.create({
          data: {
            name: room.name,
            type: room.type as any,
            status: room.status as any,
            zoneId: room.zoneId,
          },
        });
        count++;
      }
    }

    return { status: 'SUCCESS', message: `Seeded ${count} new rooms matching your screenshots!` };
  }
}
