import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { configServiceKeys } from '../../common/enums/config-service-keys.enum';

@Injectable()
export class SharedConfigService {
  private readonly encryptionKey: string;
  private readonly trelloApiKey: string;
  private readonly webhookCallbackURL: string;

  constructor(private readonly configService: ConfigService) {
    this.encryptionKey =
      this.configService.get<string>(configServiceKeys.ENCRYPTION_KEY) || '';
    this.trelloApiKey =
      this.configService.get<string>(configServiceKeys.TRELLO_API_KEY) || '';
    this.webhookCallbackURL =
      this.configService.get<string>(configServiceKeys.BACKEND_LINK) +
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
