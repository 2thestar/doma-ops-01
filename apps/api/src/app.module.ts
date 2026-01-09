import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma.module';
import { UsersModule } from './users/users.module';
import { SpacesModule } from './spaces/spaces.module';
import { TasksModule } from './tasks/tasks.module';
import { AuthModule } from './auth/auth.module';
import { BotModule } from './bot/bot.module';
import { EquipmentModule } from './equipment/equipment.module';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: require('path').join(process.cwd(), '../../.env')
    }),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', '..', 'uploads'), // Go up from dist/apps/api
      serveRoot: '/uploads',
    }),
    PrismaModule,
    UsersModule,
    SpacesModule,
    TasksModule,
    AuthModule,
    BotModule,
    EquipmentModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
