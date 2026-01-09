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
}
