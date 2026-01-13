import { SpaceType, SpaceStatus } from '@prisma/client';

export class CreateSpaceDto {
    name: string;
    type: SpaceType;
    status?: SpaceStatus;
    description?: string;
    businessUnit?: 'HOTEL' | 'FNB' | 'EVENTS' | 'ATMOS';
    zoneId: string;
}
