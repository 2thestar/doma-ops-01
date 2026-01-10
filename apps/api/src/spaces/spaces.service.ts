import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { SpaceStatus } from '@prisma/client';
import { CreateSpaceDto } from './dto/create-space.dto';
import { UpdateSpaceDto } from './dto/update-space.dto';

@Injectable()
export class SpacesService {
  constructor(private prisma: PrismaService) { }

  create(createSpaceDto: CreateSpaceDto) {
    const { zoneId, ...rest } = createSpaceDto;
    return this.prisma.space.create({
      data: {
        ...rest,
        zone: { connect: { id: zoneId } },
      },
    });
  }

  findAll() {
    return this.prisma.space.findMany({
      include: {
        zone: true,
      }
    });
  }

  findByStatus(status: SpaceStatus) {
    return this.prisma.space.findMany({
      where: { status },
      include: { zone: true },
      orderBy: { name: 'asc' }
    });
  }

  findOne(id: string) {
    return this.prisma.space.findUnique({
      where: { id },
      include: {
        zone: true,
        equipment: true,
      }
    });
  }

  update(id: string, updateSpaceDto: UpdateSpaceDto) {
    const { zoneId, ...rest } = updateSpaceDto;
    return this.prisma.space.update({
      where: { id },
      data: {
        ...rest,
        ...(zoneId && { zone: { connect: { id: zoneId } } }),
      }
    });
  }

  remove(id: string) {
    return this.prisma.space.delete({ where: { id } });
  }

  async updateStatus(id: string, status: SpaceStatus) {
    const space = await this.prisma.space.findUnique({ where: { id } });
    if (!space) throw new BadRequestException('Space not found');

    if (status === SpaceStatus.READY && space.status !== SpaceStatus.INSPECTED) {
      throw new BadRequestException('Space must be INSPECTED before being marked READY');
    }

    return this.prisma.space.update({
      where: { id },
      data: { status },
    });
  }

  async mockSeed() {
    const spaceCount = await this.prisma.space.count();
    if (spaceCount > 0) return { message: 'Database already seeded' };

    // Ensure Property Exists
    let property = await this.prisma.property.findFirst();
    if (!property) {
      property = await this.prisma.property.create({
        data: { name: 'DOMA Hotel' }
      });
    }

    // Create Default Zone
    const zone = await this.prisma.zone.create({
      data: {
        name: 'Main Building',
        propertyId: property.id
      }
    });

    // Create Spaces
    const spaces = [
      { name: 'Lobby', type: 'COMMON_AREA', status: 'READY' },
      { name: 'Gym', type: 'COMMON_AREA', status: 'READY' },
      { name: 'Restaurant', type: 'COMMON_AREA', status: 'READY' },
      { name: '101', type: 'GUEST_ROOM', status: 'READY' },
      { name: '102', type: 'GUEST_ROOM', status: 'DIRTY' },
      { name: '103', type: 'GUEST_ROOM', status: 'CLEANING' },
      { name: '104', type: 'GUEST_ROOM', status: 'INSPECTED' },
      { name: '105', type: 'GUEST_ROOM', status: 'OOO' },
      { name: '201', type: 'GUEST_ROOM', status: 'READY' },
      { name: '202', type: 'GUEST_ROOM', status: 'READY' },
      { name: '203', type: 'GUEST_ROOM', status: 'DIRTY' },
      { name: '204', type: 'GUEST_ROOM', status: 'READY' },
      { name: '205', type: 'GUEST_ROOM', status: 'READY' },
    ];

    for (const s of spaces) {
      await this.prisma.space.create({
        data: {
          name: s.name,
          type: s.type as any,
          status: s.status as any,
          zoneId: zone.id
        }
      });
    }

    return { message: `Seeded ${spaces.length} spaces` };
  }
}
