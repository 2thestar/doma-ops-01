import { Module } from '@nestjs/common';
import { MewsService } from './mews.service';
import { ConfigModule } from '@nestjs/config';

@Module({
    imports: [ConfigModule],
    providers: [MewsService],
    exports: [MewsService],
})
export class MewsModule { }
