import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class EquipmentService {
    constructor(private prisma: PrismaService) { }

    create(data: Prisma.EquipmentCreateInput) {
        return this.prisma.equipment.create({ data });
    }

    findAll() {
        return this.prisma.equipment.findMany({
            include: { space: true }
        });
    }

    findOne(id: string) {
        return this.prisma.equipment.findUnique({
            where: { id },
            include: { space: true }
        });
    }

    update(id: string, data: Prisma.EquipmentUpdateInput) {
        return this.prisma.equipment.update({
            where: { id },
            data
        });
    }

    remove(id: string) {
        return this.prisma.equipment.delete({
            where: { id }
        });
    }
}
