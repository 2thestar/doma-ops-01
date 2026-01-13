import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
    constructor() {
        let url = process.env.DATABASE_URL;
        if (url && !url.includes('pgbouncer=true')) {
            url += url.includes('?') ? '&pgbouncer=true' : '?pgbouncer=true';
        }

        super({
            datasources: {
                db: {
                    url,
                },
            },
        });
    }

    async onModuleInit() {
        try {
            console.log(`[Prisma] Connecting to DB... URL present? ${!!process.env.DATABASE_URL}`);
            await this.$connect();
            console.log('[Prisma] Connected successfully.');
        } catch (e) {
            console.error('[Prisma] Failed to connect to DB during init:', e);
            // Verify if we should exit or keep running to allow debugging
            // For now, suppress error to allow /debug-db endpoint to be reached
        }
    }
}
