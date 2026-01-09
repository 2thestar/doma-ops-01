import { Module } from '@nestjs/common';
import { BotService } from './bot.service';
import { AuthModule } from '../auth/auth.module';
import { TasksModule } from '../tasks/tasks.module';
import { SpacesModule } from '../spaces/spaces.module';

@Module({
  imports: [AuthModule, TasksModule, SpacesModule],
  providers: [BotService],
})
export class BotModule { }
