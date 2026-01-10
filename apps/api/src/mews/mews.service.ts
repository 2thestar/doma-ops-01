import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma.service';
import { SpaceStatus } from '@prisma/client';

@Injectable()
export class MewsService {
    private readonly logger = new Logger(MewsService.name);
    private readonly apiUrl: string;
    private readonly clientToken: string;
    private readonly accessToken: string;
    private readonly clientName = 'DOMA v1.0';

    constructor(
        private configService: ConfigService,
        private prisma: PrismaService
    ) {
        this.apiUrl = this.configService.get<string>('MEWS_API_URL', 'https://api.mews.com/api/connector/v1');
        this.clientToken = this.configService.get<string>('MEWS_CLIENT_TOKEN', '');
        this.accessToken = this.configService.get<string>('MEWS_ACCESS_TOKEN', '');

        if (!this.clientToken || !this.accessToken) {
            this.logger.warn('MEWS Credentials missing. Integration disabled.');
        }
    }

    async getRoomStatuses() {
        if (!this.clientToken || !this.accessToken) return [];

        try {
            const response = await fetch(`${this.apiUrl}/spaces/getAll`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ClientToken: this.clientToken,
                    AccessToken: this.accessToken,
                    Client: this.clientName,
                }),
            });

            if (!response.ok) {
                throw new Error(`MEWS API Error: ${response.statusText}`);
            }

            const data = await response.json();
            return data.Spaces || [];
        } catch (error) {
            this.logger.error('Failed to fetch from MEWS', error);
            return [];
        }
    }

    async syncRooms() {
        if (!this.clientToken || !this.accessToken) return { message: 'MEWS credentials missing' };

        try {
            const mewsRooms = await this.getRoomStatuses();
            if (mewsRooms.length === 0) return { message: 'No rooms found in MEWS.' };

            // Ensure Property & Zone Exist
            let property = await this.prisma.property.findFirst();
            if (!property) {
                property = await this.prisma.property.create({ data: { name: 'DOMA Hotel' } });
            }

            let zone = await this.prisma.zone.findFirst({ where: { propertyId: property.id } });
            if (!zone) {
                zone = await this.prisma.zone.create({
                    data: { name: 'Main Building', propertyId: property.id }
                });
            }

            let updatedCount = 0;

            for (const room of mewsRooms) {
                const mappedStatus = this.mapMewsStatus(room.State);
                if (!mappedStatus) continue;

                const existingSpace = await this.prisma.space.findFirst({
                    where: {
                        name: room.Number,
                        zoneId: zone.id
                    }
                });

                if (existingSpace) {
                    await this.prisma.space.update({
                        where: { id: existingSpace.id },
                        data: { status: mappedStatus }
                    });
                } else {
                    await this.prisma.space.create({
                        data: {
                            name: room.Number,
                            type: 'ROOM',
                            status: mappedStatus,
                            zoneId: zone.id
                        }
                    });
                }
                updatedCount++;
            }

            return { message: `Synced ${updatedCount} rooms from MEWS.` };

        } catch (error) {
            this.logger.error('Sync failed', error);
            throw error;
        }
    }

    private mapMewsStatus(mewsState: string): SpaceStatus | null {
        // Mews States: Clean, Dirty, Inspected, OutOfService, OutOfOrder
        switch (mewsState) {
            case 'Dirty': return SpaceStatus.DIRTY;
            case 'Clean': return SpaceStatus.READY;
            case 'Inspected': return SpaceStatus.INSPECTED;
            case 'OutOfOrder': return SpaceStatus.OUT_OF_ORDER;
            case 'OutOfService': return SpaceStatus.OUT_OF_SERVICE;
            default: return SpaceStatus.DIRTY; // Fallback
        }
    }
}
