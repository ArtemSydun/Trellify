import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { configServiceKeys } from '../../common/enums/config-service-keys.enum';

@Injectable()
export class SharedConfigService {
  private readonly encryptionKey: string;
  private readonly trelloApiKey: string;
  private readonly trelloWebhookUrl: string;
  private readonly paypalWebhookUrl: string;
  private readonly paypalClientId: string;
  private readonly paypalClientSecret: string;
  private readonly paypalApiUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.encryptionKey =
      this.configService.get<string>(configServiceKeys.ENCRYPTION_KEY) || '';
    this.trelloApiKey =
      this.configService.get<string>(configServiceKeys.TRELLO_API_KEY) || '';
    this.trelloWebhookUrl =
      this.configService.get<string>(configServiceKeys.BACKEND_LINK) +
      `/trello/webhooks/provider`;
    this.paypalWebhookUrl =
      this.configService.get<string>(configServiceKeys.BACKEND_LINK) +
      `/paypal/webhook/callback`;
    this.paypalClientId =
      this.configService.get<string>(configServiceKeys.PAYPAL_CLIENT_ID) || '';
    this.paypalClientSecret =
      this.configService.get<string>(configServiceKeys.PAYPAL_CLIENT_SECRET) ||
      '';
    this.paypalApiUrl =
      this.configService.get<string>(configServiceKeys.PAYPAL_API_URL) || '';
  }

  getEncryptionKey(): string {
    return this.encryptionKey;
  }

  getTrelloApiKey(): string {
    return this.trelloApiKey;
  }

  gettrelloWebhookUrl(): string {
    return this.trelloWebhookUrl;
  }

  getPaypalClientId(): string {
    return this.paypalClientId;
  }

  getPaypalClientSecret(): string {
    return this.paypalClientSecret;
  }

  getPaypalApiUrl(): string {
    return this.paypalApiUrl;
  }

  getPaypalWebhookUrl(): string {
    return this.paypalWebhookUrl;
  }
}
