import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { TrelloTokensApiService } from '@trello/api';
import { I18nContext } from 'nestjs-i18n';
import { I18nKeys } from 'src/common/enums/i18n-keys.enum';

/** key=APIKey is this.trelloApiKey of Trello power ups admin app key, which you can find here
 *  https://trello.com/power-ups/admin
 *  token=personal token of each user which he can get by authorizing here
 *  https://trello.com/1/authorize?expiration=never&scope=read&response_type=token&key={YourAPIKey}
 */

@Injectable()
export class TrelloTokensLogicService {
  private readonly logger = new Logger(TrelloTokensLogicService.name);

  constructor(
    private readonly trelloTokensApiService: TrelloTokensApiService,
  ) {}

  async isTokenInfinite(
    trelloToken: string,
    i18n: I18nContext,
  ): Promise<boolean> {
    const token = await this.trelloTokensApiService.fetchAccessToken(
      trelloToken,
      i18n,
    );

    if (token.dateExpires !== null) {
      this.logger.warn('Token has an expiration date');
      throw new BadRequestException(
        i18n?.t(I18nKeys.ERRORS_TRELLO_EXPIRED_TOKEN) ||
          'Please provide a token with a valid expiration date',
      );
    }

    this.logger.log('Trello token is infinite');
    return true;
  }
}
