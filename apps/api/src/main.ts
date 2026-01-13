import { NestFactory } from '@nestjs/core';
// Trigger restart
import * as path from 'path';
import * as fs from 'fs';
import { json, urlencoded } from 'express';

// Force load .env manually
const envPath = path.join(process.cwd(), '../../.env');
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, 'utf8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const [key, ...rest] = trimmed.split('=');
    if (key && rest.length > 0) {
      let val = rest.join('=');
      // Remove quotes if present
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      process.env[key.trim()] = val;
    }
  }
  console.log('[Manual Env Loader] Loaded env vars manually from root.');
} else {
  console.error('[Manual Env Loader] .env file not found at', envPath);
}

import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();
  app.use(json({ limit: '5mb' }));
  app.use(urlencoded({ extended: true, limit: '5mb' }));
  const port = process.env.PORT ?? 3005;
  await app.listen(port, '0.0.0.0');
  console.log(`Application is running on: ${await app.getUrl()}`);
}
bootstrap();
