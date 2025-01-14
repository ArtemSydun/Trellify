import { BadRequestException, Injectable } from '@nestjs/common';
import axios from 'axios';
import { trelloApiLink } from 'src/common/constants/trello';
import { SharedConfigService } from '../../../config/shared.config.service';

/** key=APIKey is this.trelloApiKey of Trello power ups admin app key, which you can find here
 *  https://trello.com/power-ups/admin
 *  token=personal token of each user which he can get by authorizing here
 *  https://trello.com/1/authorize?expiration=never&scope=read&response_type=token&key={YourAPIKey}
 */

@Injectable()
export class TrelloWebhooksApiService {
  private readonly trelloApiKey: string;

  constructor(private readonly sharedConfigService: SharedConfigService) {
    this.trelloApiKey = this.sharedConfigService.getTrelloApiKey();
  }

  // # Webhooks
  async createWebhook(
    creatorToken: string,
    callbackUrl: string,
    idModel: string,
  ) {
    const url = `${trelloApiLink}/webhooks/?callbackURL=${callbackUrl}&idModel=${idModel}&key=${this.trelloApiKey}&token=${creatorToken}`;
    try {
      const response = await axios.post(url);
      return response.data;
    } catch (err) {
      throw new BadRequestException(
        err.response ? err.response.data : err.message,
      );
    }
  }

  async deleteWebhook(creatorToken: string, webhookId: string): Promise<any> {
    const url = `${trelloApiLink}/webhooks/${webhookId}?key=${this.trelloApiKey}&token=${creatorToken}`;

    try {
      const response = await axios.delete(url);
      return response.data;
    } catch (err) {
      throw new BadRequestException(
        err.response ? err.response.data : err.message,
      );
    }
  }
}
