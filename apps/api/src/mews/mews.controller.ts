import { Controller, Post } from '@nestjs/common';
import { MewsService } from './mews.service';

@Controller('mews')
export class MewsController {
    constructor(private readonly mewsService: MewsService) { }

    @Post('sync')
    sync() {
        return this.mewsService.syncRooms();
    }
}
