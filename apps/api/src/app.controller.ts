import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) { }

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('migrate')
  async runMigration() {
    const { exec } = require('child_process');
    return new Promise((resolve) => {
      exec('npx prisma migrate deploy --schema=/app/packages/shared/schema.prisma', (error, stdout, stderr) => {
        if (error) {
          resolve({ status: 'ERROR', error: error.message, stderr });
          return;
        }
        resolve({ status: 'SUCCESS', stdout, stderr });
      });
    });
  }
}
