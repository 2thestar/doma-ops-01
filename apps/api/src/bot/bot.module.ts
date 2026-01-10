import { Module, forwardRef } from '@nestjs/common';
import { BotService } from './bot.service';
import { AuthModule } from '../auth/auth.module';
import { TasksModule } from '../tasks/tasks.module';
import { SpacesModule } from '../spaces/spaces.module';

@Module({
  imports: [AuthModule, forwardRef(() => TasksModule), SpacesModule],
  providers: [BotService],
  exports: [BotService],
})
export class BotModule { }
