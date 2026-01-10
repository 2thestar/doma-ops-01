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
        await this.$connect();
    }
}
