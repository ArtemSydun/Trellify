import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { configServiceEnum } from 'src/common/enums/config.service.enum';

@Injectable()
export class SharedConfigService {
  private readonly encryptionKey: string;
  private readonly trelloApiKey: string;
  private readonly webhookCallbackURL: string;

  constructor(private readonly configService: ConfigService) {
    this.encryptionKey = this.configService.get(configServiceEnum.ENCRYPTION_KEY) || '';
    this.trelloApiKey = this.configService.get(configServiceEnum.TRELLO_API_KEY) || '';
    this.webhookCallbackURL = this.configService.get(configServiceEnum.BACKEND_LINK) + `/trello/webhooks`;
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
