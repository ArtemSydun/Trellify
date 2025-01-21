import { BadRequestException, Injectable } from '@nestjs/common';
import axios from 'axios';
import { I18nContext } from 'nestjs-i18n';
import { trelloApiLink } from 'src/common/constants/trello';
import { parseTrelloError } from 'src/common/helpers/trello-errors';
import { SharedConfigService } from '../../../config/shared.config.service';
import { TrelloBoard } from '../../dto/board.dto';
import { TrelloBoardField } from '../../enums/trello.model.fields.enum';

/** key=APIKey is this.trelloApiKey of Trello power ups admin app key, which you can find here
 *  https://trello.com/power-ups/admin
 *  token=personal token of each user which he can get by authorizing here
 *  https://trello.com/1/authorize?expiration=never&scope=read&response_type=token&key={YourAPIKey}
 */

@Injectable()
export class TrelloBoardsApiService {
  private readonly trelloApiKey: string;

  constructor(private readonly sharedConfigService: SharedConfigService) {
    this.trelloApiKey = this.sharedConfigService.getTrelloApiKey();
  }

  // # Boards
  async fetchBoardsMemberBelongsTo(
    token: string,
    trelloUserId: string,
  ): Promise<TrelloBoard[]> {
    const url = `${trelloApiLink}/members/${trelloUserId}/boards?key=${this.trelloApiKey}&token=${token}`;

    try {
      const response = await axios.get(url);
      return response.data;
    } catch (err) {
      throw new BadRequestException(
        err.response ? err.response.data : err.message,
      );
    }
  }

  async fetchBoardField(
    token: string,
    boardId: string,
    fieldName: TrelloBoardField,
  ): Promise<any> {
    const url = `${trelloApiLink}/boards/${boardId}/${fieldName}?key=${this.trelloApiKey}&token=${token}`;

    //here we normalize response especially for this request
    try {
      const response = await axios.get(url);

      let result;

      if ('_value' in response.data) {
        result = { value: response.data._value };
      } else {
        result = { value: response.data };
      }

      return result;
    } catch (err) {
      throw new BadRequestException(
        err.response ? err.response.data : err.message,
      );
    }
  }

  async fetchBoardById(
    token: string,
    boardId: string,
    i18n?: I18nContext,
  ): Promise<TrelloBoard> {
    const url = `${trelloApiLink}/boards/${boardId}?key=${this.trelloApiKey}&token=${token}`;

    try {
      const response = await axios.get(url);

      return response.data;
    } catch (err) {
      const errorMessage = parseTrelloError(err, i18n);
      throw new BadRequestException(errorMessage);
    }
  }

  async fetchBoardMemberships(
    token: string,
    boardId: string,
    i18n?: I18nContext,
  ): Promise<any> {
    const url = `${trelloApiLink}/boards/${boardId}/memberships?key=${this.trelloApiKey}&token=${token}`;

    try {
      const response = await axios.get(url);

      return response.data;
    } catch (err) {
      const errorMessage = parseTrelloError(err, i18n);
      throw new BadRequestException(errorMessage);
    }
  }

  async fetchBoardsInOrganization(
    token: string,
    organizationId: string,
    i18n?: I18nContext,
  ): Promise<TrelloBoard[]> {
    const url = `${trelloApiLink}/organizations/${organizationId}/boards?key=${this.trelloApiKey}&token=${token}`;

    try {
      const response = await axios.get(url);

      return response.data;
    } catch (err) {
      const errorMessage = parseTrelloError(err, i18n);
      throw new BadRequestException(errorMessage);
    }
  }
}
