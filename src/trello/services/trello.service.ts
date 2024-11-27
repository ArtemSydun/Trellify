import { BadRequestException, forwardRef, HttpStatus, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { UserService } from 'src/user/services/user.service';
import { ConfigService } from '@nestjs/config';
import { configServiceEnum } from 'src/common/enums/config.service.enum';
import { decryptText } from 'src/common/helpers/hashing';
import { DefaultResponse } from 'src/common/interfaces/responses';
import axios from 'axios';
import { trelloApiLink } from 'src/common/constants/trello.links';
import { WebhookInterface } from '../interfaces/webhook.interface';

/** key=APIKey is this.trelloApiKey of Trello power ups admin app key, which you can find here
 *  https://trello.com/power-ups/admin
 *  token=personal token of each user which he can get by authorizing here
 *  https://trello.com/1/authorize?expiration=1day&scope=read&response_type=token&key={YourAPIKey}
 */

@Injectable()
export class TrelloService {
  private readonly webhookCallbackURL: string;
  private readonly encryptionKey: string;
  private readonly trelloApiKey: string;
  constructor(
    @Inject(forwardRef(() => UserService))
    private readonly userService: UserService,
    private readonly configService: ConfigService,
  ) {
    this.webhookCallbackURL = this.configService.get(configServiceEnum.NGROK_APP_LINK) + `/trello/webhook`;
    this.encryptionKey = this.configService.get(configServiceEnum.ENCRYPTION_KEY) || '';
    this.trelloApiKey = this.configService.get(configServiceEnum.TRELLO_API_KEY) || '';
  }

  async createTrelloWebhook(userId: string, boardId: string): Promise<DefaultResponse<any>> {
    const userPersonalWebhookURL = `${this.webhookCallbackURL}/${userId}`;
    const user = await this.userService.findUserById(userId);
    if (!user) {
      throw new Error(`User with ID ${userId} not found`);
    }

    const decryptedUserToken = decryptText(user.trelloToken, this.encryptionKey);

    const url = `${trelloApiLink}/webhooks/?callbackURL=${userPersonalWebhookURL}&idModel=${boardId}&key=${this.trelloApiKey}&token=${decryptedUserToken}`;

    try {
      const response = await axios.post(url);
      console.log('Webhook created: ', response.data);

      const updatedUser = {
        webhooks: user.webhooks ? [...user.webhooks, response.data] : [response.data],
      };

      await this.userService.updateUserById(userId, updatedUser);

      return {
        message: 'Webhook created successfully',
        statusCode: HttpStatus.OK,
        data: response.data,
      };

    } catch (err) {
      console.error('Error creating webhook:', err.response ? err.response.data : err.message);
      throw new BadRequestException(err.response ? err.response.data : err.message);
    }
  }

  async updateTrelloWebhook(userId: string, webhookId: string, webhookUpdateDto: WebhookInterface): Promise<DefaultResponse<any>> {
    const user = await this.userService.findUserById(userId);

    const webhookToUpdate = user.webhooks.find(webhook => webhook.id === webhookId);

    const decryptedUserToken = decryptText(user.trelloToken, this.encryptionKey);

    if (!webhookToUpdate) {
      throw new NotFoundException(`Webhook ${webhookId} not found`);
    }

    const url = `${trelloApiLink}/webhooks/${webhookId}?key=${this.trelloApiKey}&token=${decryptedUserToken}`;
    
    try {
      
      const response = await axios.put(url, webhookUpdateDto)

      const updatedWebhooks = user.webhooks.map(webhook =>
        webhook.id === webhookId ? { ...webhook, ...webhookUpdateDto } : webhook
      );

      await this.userService.updateUserById(userId, { webhooks: updatedWebhooks });

      return {
        message: `Webhook ${webhookId} updated successfully`,
        statusCode: HttpStatus.OK,
        data: response.data
      }
    } catch (err) {
      console.error('Error updating webhook:', err.response ? err.response.data : err.message);
      throw new BadRequestException(err.response ? err.response.data : err.message);
    }
  }

  async removeTrelloWebhook(userId: string, webhookId: string): Promise<DefaultResponse<null>> {
    const user = await this.userService.findUserById(userId);
    const updatedWebhooks = user.webhooks ? user.webhooks.filter(webhook => webhook.id !== webhookId) : [];
    const decryptedUserToken = decryptText(user.trelloToken, this.encryptionKey);
    if (updatedWebhooks.length === user.webhooks.length) {
      throw new NotFoundException(`Webhook ${webhookId} does not exists`);
    }

    await axios.delete(`${trelloApiLink}/webhooks/${webhookId}?key=${this.trelloApiKey}&token=${decryptedUserToken}`);
    const updatedUser = {
      webhooks: updatedWebhooks
    };

    await this.userService.updateUserById(userId, updatedUser);

    return {
      message: `Webhook ${webhookId} deleted successfully`,
      statusCode: HttpStatus.OK,
    }
  }

  async findBoardsMemberBelongsTo(userId: string): Promise<DefaultResponse<any>> {
    const user = await this.userService.findUserById(userId);
    const decryptedUserToken = decryptText(user.trelloToken, this.encryptionKey);
    const url = `${trelloApiLink}/members/${user.trelloUserId}/boards?key=${this.trelloApiKey}&token=${decryptedUserToken}`;

    try {
      const response = await axios.get(url);

      return {
        message: 'Member related boards',
        statusCode: HttpStatus.OK,
        data: response.data
      }
    } catch (err) {
      throw err;
    }
  }

  async findMemberWebhooks(userId: string): Promise<DefaultResponse<any>> {
    const user = await this.userService.findUserById(userId);

    const decryptedUserToken = decryptText(user.trelloToken, this.encryptionKey);
    
    const url = `${trelloApiLink}/tokens/${decryptedUserToken}/webhooks?key=${this.trelloApiKey}`;

    try {
      const response = await axios.get(url);

      return {
        message: 'Webhook list',
        statusCode: HttpStatus.OK,
        data: response.data,
      };

    } catch (err) {
      console.error('Error finding members webhooks:', err.response ? err.response.data : err.message);
      throw new BadRequestException(err.response ? err.response.data : err.message);
    }
  }

  async findMemberProfile(userId: string): Promise<DefaultResponse<any>> {
    const user = await this.userService.findUserById(userId);

    const decryptedUserToken = decryptText(user.trelloToken, this.encryptionKey);

    try {
      const response = await axios.get(`${trelloApiLink}/members/me?key=${this.trelloApiKey}&token=${decryptedUserToken}`);

      return {
        message: `User ${userId} trello profile info`,
        statusCode: HttpStatus.OK,
        data: response.data,
      };

    } catch (err) {
      console.error('Error fetching user trello profile info:', err.response ? err.response.data : err.message);
      throw new BadRequestException(err.response ? err.response.data : err.message);
    }
  }

  async findMemberRelatedCards(userId: string): Promise<DefaultResponse<any>> {
    const user = await this.userService.findUserById(userId);

    const decryptedUserToken = decryptText(user.trelloToken, this.encryptionKey);

    const url = `${trelloApiLink}/members/${user.trelloUserId}/cards?key=${this.trelloApiKey}&token=${decryptedUserToken}`;

    try {
      const response = await axios.get(url);

      return {
        message: 'Member related cards',
        statusCode: HttpStatus.OK,
        data: response.data
      }
    } catch (err) {
      console.error('Error creating webhook:', err.response ? err.response.data : err.message);
      throw new BadRequestException(err.response ? err.response.data : err.message);
    }
  }
}
