import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { EquipmentService } from './equipment.service';
import { Prisma } from '@prisma/client';

@Controller('equipment')
export class EquipmentController {
    constructor(private readonly equipmentService: EquipmentService) { }

    @Post()
    create(@Body() createEquipmentDto: { name: string; serialNumber?: string; spaceId: string }) {
        return this.equipmentService.create({
            name: createEquipmentDto.name,
            serialNumber: createEquipmentDto.serialNumber,
            space: { connect: { id: createEquipmentDto.spaceId } }
        });
    }

    @Get()
    findAll() {
        return this.equipmentService.findAll();
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.equipmentService.findOne(id);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() updateEquipmentDto: Prisma.EquipmentUpdateInput) {
        return this.equipmentService.update(id, updateEquipmentDto);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.equipmentService.remove(id);
    }
}
