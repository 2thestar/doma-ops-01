import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MewsService {
    private readonly logger = new Logger(MewsService.name);
    private readonly apiUrl: string;
    private readonly clientToken: string;
    private readonly accessToken: string;
    private readonly clientName = 'DOMA v1.0';

    constructor(private configService: ConfigService) {
        this.apiUrl = this.configService.get<string>('MEWS_API_URL', 'https://api.mews.com/api/connector/v1');
        this.clientToken = this.configService.get<string>('MEWS_CLIENT_TOKEN', '');
        this.accessToken = this.configService.get<string>('MEWS_ACCESS_TOKEN', '');

        if (!this.clientToken || !this.accessToken) {
            this.logger.warn('MEWS Credentials missing. Integration disabled.');
        }
    }

    async getRoomStatuses() {
        if (!this.clientToken || !this.accessToken) return [];

        try {
            const response = await fetch(`${this.apiUrl}/spaces/getAll`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ClientToken: this.clientToken,
                    AccessToken: this.accessToken,
                    Client: this.clientName,
                }),
            });

            if (!response.ok) {
                throw new Error(`MEWS API Error: ${response.statusText}`);
            }

            const data = await response.json();
            return data.Spaces || []; // Adjust based on actual API response structure
        } catch (error) {
            this.logger.error('Failed to sync with MEWS', error);
            return [];
        }
    }
}
