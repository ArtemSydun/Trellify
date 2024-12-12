import { BadRequestException, forwardRef, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { UsersService } from 'src/user/services/users.service';
import { ConfigService } from '@nestjs/config';
import { configServiceEnum } from 'src/common/enums/config.service.enum';
import { decryptText } from 'src/common/helpers/hashing';
import axios from 'axios';
import { TrelloWebhookRepository } from '../repositories/webhook.repository';
import { Webhook } from '../entities/webhook.entity';
import { trelloApiLink } from 'src/common/constants/trello';


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
    private readonly configService: ConfigService,
    private readonly trelloWebhookRepository: TrelloWebhookRepository,
  ) {
    this.encryptionKey = this.configService.get(configServiceEnum.ENCRYPTION_KEY) || '';
    this.trelloApiKey = this.configService.get(configServiceEnum.TRELLO_API_KEY) || '';
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

  async findBoardById(token: string, boardId: string): Promise<any> {
    const url = `${trelloApiLink}/boards/${boardId}?key=${this.trelloApiKey}&token=${token}`;
    console.log(url);

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

  async findWebhookById(webhookId: string): Promise<Webhook> {
    const webhook = await this.trelloWebhookRepository.findOneById(webhookId);

    if (!webhook) {
      throw new NotFoundException(`Webhook with id ${webhookId} not found`);
    }

    return webhook;
  }

  async findWebhookByBoardId(boardId: string): Promise<Webhook> {
    const webhook = await this.trelloWebhookRepository.findOneByBoardId(boardId);

    if (!webhook) {
      throw new NotFoundException(`Webhook with boardId ${boardId} not found`);
    }

    return webhook;
  }
}
