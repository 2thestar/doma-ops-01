import { Module } from '@nestjs/common';
import { MewsService } from './mews.service';
import { MewsController } from './mews.controller';
import { ConfigModule } from '@nestjs/config';

@Module({
    imports: [ConfigModule],
    controllers: [MewsController],
    providers: [MewsService],
    exports: [MewsService],
})
export class MewsModule { }
