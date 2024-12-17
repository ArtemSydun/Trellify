import {
  BadRequestException,
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { UsersService } from 'src/user/services/users.service';
import { decryptText } from 'src/common/helpers/hashing';
import axios from 'axios';
import { trelloApiLink } from 'src/common/constants/trello';
import { SharedConfigService } from './shared.config.service';
import { WebhookService } from './webhook.service';
import { TrelloBoardField } from '../enums/trello.model.fields.enum';
import { User } from 'src/user/entities/user.entity';

/** key=APIKey is this.trelloApiKey of Trello power ups admin app key, which you can find here
 *  https://trello.com/power-ups/admin
 *  token=personal token of each user which he can get by authorizing here
 *  https://trello.com/1/authorize?expiration=never&scope=read&response_type=token&key={YourAPIKey}
 */

@Injectable()
export class TrelloService {
  private readonly encryptionKey: string;
  private readonly trelloApiKey: string;
  private readonly logger = new Logger(TrelloService.name);

  constructor(
    @Inject(forwardRef(() => UsersService))
    private readonly userService: UsersService,
    private readonly sharedConfigService: SharedConfigService,
    private readonly webhookService: WebhookService,
  ) {
    this.encryptionKey = this.sharedConfigService.getEncryptionKey();
    this.trelloApiKey = this.sharedConfigService.getTrelloApiKey();
  }

  async findBoardsMemberBelongsTo(user: string | User): Promise<any> {
    const userToFind = await this.userService.getUser(user);
    const decryptedUserToken = decryptText(userToFind.trello.token, this.encryptionKey);

    const url = `${trelloApiLink}/members/${userToFind.trello.userId}/boards?key=${this.trelloApiKey}&token=${decryptedUserToken}`;

    try {
      const response = await axios.get(url);
      this.logger.log(`Successfully fetched boards for user ${userToFind.id}`);
      return response.data;
    } catch (err) {
      this.logger.error(`Error fetching boards for user ${userToFind.id}: ${err.message}`);
      throw new BadRequestException(err.response ? err.response.data : err.message);
    }
  }

  async findBoardField(boardId: string, fieldName: TrelloBoardField): Promise<any> {
    const webhook = await this.webhookService.findWebhookByBoardId(boardId);
    const decryptedUserToken = decryptText(webhook.authorToken, this.encryptionKey);

    const url = `${trelloApiLink}/boards/${boardId}/${fieldName}?key=${this.trelloApiKey}&token=${decryptedUserToken}`;

    try {
      const response = await axios.get(url);
      let result;

      if ('_value' in response.data) {
        result = { value: response.data._value };
      } else {
        result = { value: response.data };
      }

      this.logger.log(`Successfully fetched field ${fieldName} for board ${boardId}`);
      return result;
    } catch (err) {
      this.logger.error(`Error fetching field ${fieldName} for board ${boardId}: ${err.message}`);
      throw new BadRequestException(err.response ? err.response.data : err.message);
    }
  }

  async findBoardById(token: string, boardId: string): Promise<any> {
    const url = `${trelloApiLink}/boards/${boardId}?key=${this.trelloApiKey}&token=${token}`;

    try {
      const response = await axios.get(url);
      this.logger.log(`Successfully fetched board data for board ${boardId}`);
      return response.data;
    } catch (err) {
      this.logger.error(`Error fetching board data for board ${boardId}: ${err.message}`);
      throw new BadRequestException(err.response ? err.response.data : err.message);
    }
  }

  async findCardById(token: string, cardId: string): Promise<any> {
    const url = `${trelloApiLink}/cards/${cardId}?key=${this.trelloApiKey}&token=${token}`;

    try {
      const response = await axios.get(url);
      this.logger.log(`Successfully fetched card data for card ${cardId}`);
      return response.data;
    } catch (err) {
      this.logger.error(`Error fetching card data for card ${cardId}: ${err.message}`);
      throw new BadRequestException(err.response ? err.response.data : err.message);
    }
  }

  async findMemberProfile(user: string | User, token?: string): Promise<any> {
    const userToFind = await this.userService.getUser(user);
    const decryptedUserToken = token
      ? decryptText(token, this.encryptionKey)
      : decryptText(userToFind.trello.token, this.encryptionKey);

    try {
      const response = await axios.get(`${trelloApiLink}/members/me?key=${this.trelloApiKey}&token=${decryptedUserToken}`);
      this.logger.log(`Successfully fetched Trello profile for user ${userToFind.id}`);
      return response.data;
    } catch (err) {
      this.logger.error(`Error fetching Trello profile for user ${userToFind.id}: ${err.message}`);
      throw new BadRequestException(err.response ? err.response.data : err.message);
    }
  }

  async findMemberRelatedCards(user: string | User): Promise<any> {
    const userToFind = await this.userService.getUser(user);
    const decryptedUserToken = decryptText(userToFind.trello.token, this.encryptionKey);

    const url = `${trelloApiLink}/members/${userToFind.trello.userId}/cards?key=${this.trelloApiKey}&token=${decryptedUserToken}`;

    try {
      const response = await axios.get(url);
      this.logger.log(`Successfully fetched cards for user ${userToFind.id}`);
      return response.data;
    } catch (err) {
      this.logger.error(`Error fetching cards for user ${userToFind.id}: ${err.message}`);
      throw new BadRequestException(err.response ? err.response.data : err.message);
    }
  }

  async findBoardMemberships(token: string, boardId: string): Promise<any> {
    const url = `${trelloApiLink}/boards/${boardId}/memberships?key=${this.trelloApiKey}&token=${token}`;

    try {
      const response = await axios.get(url);
      this.logger.log(`Successfully fetched board memberships for board ${boardId}`);
      return response.data;
    } catch (err) {
      this.logger.error(`Error fetching board memberships for board ${boardId}: ${err.message}`);
      throw new BadRequestException(err.response ? err.response.data : err.message);
    }
  }

  async isTokenInfinite(trelloToken: string): Promise<boolean> {
    const token = await this.findAccessToken(trelloToken);

    if (token.dateExpires !== null) {
      this.logger.warn('Token has an expiration date');
      throw new BadRequestException('Please provide a token with a valid expiration date');
    }

    this.logger.log('Trello token is infinite');
    return true;
  }

  async findAccessToken(trelloToken: string): Promise<any> {
    const url = `${trelloApiLink}/tokens/${trelloToken}?key=${this.trelloApiKey}&token=${trelloToken}`;

    try {
      const response = await axios.get(url);
      this.logger.log(`Successfully fetched access token details for token ${trelloToken}`);
      return response.data;
    } catch (err) {
      this.logger.error(`Error fetching access token details for token ${trelloToken}: ${err.message}`);
      throw new UnauthorizedException('Invalid token');
    }
  }
}
