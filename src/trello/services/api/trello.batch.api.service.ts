import { BadRequestException, Injectable } from '@nestjs/common';
import axios from 'axios';
import { I18nContext } from 'nestjs-i18n';
import { trelloApiLink } from 'src/common/constants/trello';
import { parseTrelloError } from 'src/common/helpers/trello-errors';
import { SharedConfigService } from '../../../config/services/shared.config.service';

/** key=APIKey is this.trelloApiKey of Trello power ups admin app key, which you can find here
 *  https://trello.com/power-ups/admin
 *  token=personal token of each user which he can get by authorizing here
 *  https://trello.com/1/authorize?expiration=never&scope=read&response_type=token&key={YourAPIKey}
 */

@Injectable()
export class TrelloBatchApiService {
  private readonly trelloApiKey: string;

  constructor(private readonly sharedConfigService: SharedConfigService) {
    this.trelloApiKey = this.sharedConfigService.getTrelloApiKey();
  }

  // # batch object should be like this  { card: '/cards/:cardId', board: '/boards/:boardId '} and it should transform
  //   object to this { card: response.data[0][200] || null, board: response.data[0][200] || null etc}
  async fetchManyUrls(
    batchObject: Record<string, string>, // Expecting an object like { card: '/cards/:cardId', board: '/boards/:boardId' }
    token: string,
    i18n?: I18nContext,
  ): Promise<any> {
    try {
      // Transform batchObject into a URL query string
      const urls = Object.values(batchObject).join(',');

      // Construct the API request URL
      const url = `${trelloApiLink}/batch?urls=${encodeURIComponent(urls)}&key=${this.trelloApiKey}&token=${token}`;

      // Send the request
      const response = await axios.get(url);

      // Transform the response into an object matching batchObject keys
      const mappedResponse = Object.keys(batchObject).reduce(
        (acc, key, index) => {
          acc[key] = response.data[index]?.['200'] || null; // Safely access the response
          return acc;
        },
        {} as Record<string, any>,
      );

      return mappedResponse;
    } catch (err) {
      const errorMessage = parseTrelloError(err, i18n);
      throw new BadRequestException(errorMessage);
    }
  }
}
