import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { configServiceEnum } from '../common/enums/config.service.enum';

@Injectable()
export class SharedConfigService {
  private readonly encryptionKey: string;
  private readonly trelloApiKey: string;
  private readonly webhookCallbackURL: string;

  constructor(private readonly configService: ConfigService) {
    this.encryptionKey =
      this.configService.get<string>(configServiceEnum.ENCRYPTION_KEY) || '';
    this.trelloApiKey =
      this.configService.get<string>(configServiceEnum.TRELLO_API_KEY) || '';
    this.webhookCallbackURL =
      this.configService.get<string>(configServiceEnum.BACKEND_LINK) +
      `/trello/webhooks/provider`;
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
