import { SpaceType, SpaceStatus } from '@prisma/client';

export class CreateSpaceDto {
    name: string;
    type: SpaceType;
    status?: SpaceStatus;
    zoneId: string;
}
