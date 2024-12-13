import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SharedConfigService {
  private readonly encryptionKey: string;
  private readonly trelloApiKey: string;
  private readonly webhookCallbackURL: string;

  constructor(
    private readonly configService: ConfigService,
  ) {
    this.encryptionKey = this.configService.get<string>('ENCRYPTION_KEY') || '';
    this.trelloApiKey = this.configService.get<string>('TRELLO_API_KEY') || '';
    this.webhookCallbackURL = this.configService.get<string>('BACKEND_LINK') + `/trello/webhooks`;
  }

  getEncryptionKey(): string {
    return this.encryptionKey;
  }

  getTrelloApiKey(): string {
    return this.trelloApiKey;
  }

  getWebhookCallbackURL(): string {
    return this.webhookCallbackURL;
  }
}
