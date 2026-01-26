import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
    constructor() {
        const url = process.env.DATABASE_URL;

        // Removed automatic pgbouncer=true appendage as it may cause connection issues with certain providers/modes.
        // Users should include it in the connection string if required.

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
