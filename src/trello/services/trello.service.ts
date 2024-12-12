import { BadRequestException, forwardRef, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { UsersService } from 'src/user/services/users.service';
import { ConfigService } from '@nestjs/config';
import { configServiceEnum } from 'src/common/enums/config.service.enum';
import { decryptText } from 'src/common/helpers/hashing';
import axios from 'axios';
import { TrelloWebhookRepository } from '../repositories/webhook.repository';
import { trelloApiLink } from 'src/common/constants/trello';
import { SharedConfigService } from './shared.config.service';
import { WebhookService } from './webhook.service';
import { TrelloBoardField } from '../enums/trello.model.fields.enum';


/** key=APIKey is this.trelloApiKey of Trello power ups admin app key, which you can find here
 *  https://trello.com/power-ups/admin
 *  token=personal token of each user which he can get by authorizing here
 *  https://trello.com/1/authorize?expiration=never&scope=read&response_type=token&key={YourAPIKey}
 */

@Injectable()
export class TrelloService {
  private readonly encryptionKey: string;
  private readonly trelloApiKey: string;
  constructor(
    @Inject(forwardRef(() => UsersService))
    private readonly userService: UsersService,
    private readonly sharedConfigService: SharedConfigService,
    private readonly webhookService: WebhookService,
  ) {
    this.encryptionKey = this.sharedConfigService.getEncryptionKey();
    this.trelloApiKey = this.sharedConfigService.getTrelloApiKey();
  }

  async findBoardsMemberBelongsTo(userId: string): Promise<any> {
    const user = await this.userService.findUserById(userId);

    const decryptedUserToken = decryptText(user.trello.token, this.encryptionKey);

    const url = `${trelloApiLink}/members/${user.trello.userId}/boards?key=${this.trelloApiKey}&token=${decryptedUserToken}`;

    try {
      const response = await axios.get(url);

      return response.data
    } catch (err) {
      throw err;
    }
  }

  async findBoardField(boardId: string, fieldName: TrelloBoardField): Promise<any> {
    const webhook = await this.webhookService.findWebhookByBoardId(boardId);

    const decryptedUserToken = decryptText(webhook.authorToken, this.encryptionKey);

    const url = `${trelloApiLink}/boards/${boardId}/${fieldName}?key=${this.trelloApiKey}&token=${decryptedUserToken}`;

    try {
      const response = await axios.get(url);

      let result;

      // If the response contains '_value', extract it and return with 'value' key
      // trello api returns response.data._value if under key was string
      // if there are object or array it returns plain data
      if ('_value' in response.data) {
        result = { value: response.data._value };
      } else {
        // Otherwise, wrap the response data under 'value'
        if (typeof response.data === 'string') {
          result = { value: response.data };
        } else if (Array.isArray(response.data)) {
          result = { value: response.data };
        } else if (typeof response.data === 'object') {
          result = { value: response.data };
        } else {
          result = { value: null };
        }
      }

      return result;

    } catch (err) {
      console.error('Error fetching board field:', err.message);
    }
  }



  async findBoardById(token: string, boardId: string): Promise<any> {
    const url = `${trelloApiLink}/boards/${boardId}?key=${this.trelloApiKey}&token=${token}`;

    const response = await axios.get(url);
    try {
      return response.data;
    } catch (err) {
      console.error('Error fetching board data:', err);
    }
  }

  async findCardById(token: string, cardId: string): Promise<any> {
    const url = `${trelloApiLink}/cards/${cardId}?key=${this.trelloApiKey}&token=${token}`;

    const response = await axios.get(url);
    try {
      return response.data;
    } catch (err) {
      console.error('Error fetching card data:', err);
    }
  }

  async findMemberProfile(userId: string, token?: string): Promise<any> {
    const user = await this.userService.findUserById(userId);

    const decryptedUserToken = token
      ? decryptText(token, this.encryptionKey)
      : decryptText(user.trello.token, this.encryptionKey);

    try {
      const response = await axios.get(`${trelloApiLink}/members/me?key=${this.trelloApiKey}&token=${decryptedUserToken}`);

      return response.data

    } catch (err) {
      console.error('Error fetching user trello profile info:', err.response ? err.response.data : err.message);
      throw new BadRequestException(err.response ? err.response.data : err.message);
    }
  }

  async findMemberRelatedCards(userId: string): Promise<any> {
    const user = await this.userService.findUserById(userId);

    const decryptedUserToken = decryptText(user.trello.token, this.encryptionKey);

    const url = `${trelloApiLink}/members/${user.trello.userId}/cards?key=${this.trelloApiKey}&token=${decryptedUserToken}`;

    try {
      const response = await axios.get(url);

      return response.data;
    } catch (err) {
      console.error('Error creating webhook:', err.response ? err.response.data : err.message);
      throw new BadRequestException(err.response ? err.response.data : err.message);
    }
  }

  async findBoardMemberships(token: string, boardId: string): Promise<any> {
    const url = `${trelloApiLink}/boards/${boardId}/memberships?key=${this.trelloApiKey}&token=${token}`;

    const response = await axios.get(url);
    try {
      return response.data;
    } catch (err) {
      console.error('Error fetching card data:', err);
    }
  }
}
