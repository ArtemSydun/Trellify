import { BadRequestException, Injectable } from '@nestjs/common';
import axios from 'axios';
import { I18nContext } from 'nestjs-i18n';
import { trelloApiLink } from 'src/common/constants/trello';
import { parseTrelloError } from 'src/common/helpers/trello-errors';
import { SharedConfigService } from '../../../config/shared.config.service';

import { TrelloCard } from '../../dto/card.dto';

/** key=APIKey is this.trelloApiKey of Trello power ups admin app key, which you can find here
 *  https://trello.com/power-ups/admin
 *  token=personal token of each user which he can get by authorizing here
 *  https://trello.com/1/authorize?expiration=never&scope=read&response_type=token&key={YourAPIKey}
 */

@Injectable()
export class TrelloCardsApiService {
  private readonly trelloApiKey: string;

  constructor(private readonly sharedConfigService: SharedConfigService) {
    this.trelloApiKey = this.sharedConfigService.getTrelloApiKey();
  }

  // # Cards
  async fetchCardById(
    token: string,
    cardId: string,
    i18n?: I18nContext,
  ): Promise<TrelloCard> {
    const url = `${trelloApiLink}/cards/${cardId}?key=${this.trelloApiKey}&token=${token}`;

    try {
      const response = await axios.get(url);
      return response.data;
    } catch (err) {
      const errorMessage = parseTrelloError(err, i18n);
      throw new BadRequestException(errorMessage);
    }
  }

  async fetchMemberRelatedCards(
    token: string,
    trelloUserId: string,
    i18n?: I18nContext,
  ): Promise<TrelloCard[]> {
    const url = `${trelloApiLink}/members/${trelloUserId}/cards?key=${this.trelloApiKey}&token=${token}`;

    try {
      const response = await axios.get(url);
      return response.data;
    } catch (err) {
      const errorMessage = parseTrelloError(err, i18n);
      throw new BadRequestException(errorMessage);
    }
  }
}
