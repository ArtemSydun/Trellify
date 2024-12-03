import { BadRequestException, ConflictException, forwardRef, HttpStatus, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { UserService } from 'src/user/services/user.service';
import { ConfigService } from '@nestjs/config';
import { configServiceEnum } from 'src/common/enums/config.service.enum';
import { decryptText } from 'src/common/helpers/hashing';
import { DefaultResponse } from 'src/common/interfaces/responses';
import axios from 'axios';
import { trelloApiLink } from 'src/common/constants/trello.links';
import { TrelloWebhookRepository } from '../repositories/webhook.repository';
import { Webhook } from '../entities/webhook.entity';
import { CreateWebhookDto } from '../dto/create-webhook.dto';
import { User } from 'src/user/entities/user.entity';

/** key=APIKey is this.trelloApiKey of Trello power ups admin app key, which you can find here
 *  https://trello.com/power-ups/admin
 *  token=personal token of each user which he can get by authorizing here
 *  https://trello.com/1/authorize?expiration=never&scope=read&response_type=token&key={YourAPIKey}
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
    private readonly trelloWebhookRepository: TrelloWebhookRepository,
  ) {
    this.webhookCallbackURL = this.configService.get(configServiceEnum.API_LINK) + `/trello/webhook`;
    this.encryptionKey = this.configService.get(configServiceEnum.ENCRYPTION_KEY) || '';
    this.trelloApiKey = this.configService.get(configServiceEnum.TRELLO_API_KEY) || '';
  }

  async createTrelloWebhook(userId: string, createWebhookDto: CreateWebhookDto): Promise<DefaultResponse<Webhook>> {
    const boardPersonalWebhookURL = `${this.webhookCallbackURL}/${createWebhookDto.boardId}`;
    const webhook = await this.trelloWebhookRepository.findOneByBoardId(createWebhookDto.boardId);

    const user = await this.userService.findUserById(userId);

    if (user.trello.webhooks.find(userWebhook => userWebhook === webhook.id)) {
      throw new ConflictException(`Webhook for board ${webhook.boardName} already exists for this user.`);
    }

    const decryptedUserToken = decryptText(user.trello.token, this.encryptionKey);

    const url = `${trelloApiLink}/webhooks/?callbackURL=${boardPersonalWebhookURL}&idModel=${createWebhookDto.boardId}&key=${this.trelloApiKey}&token=${decryptedUserToken}`;

    if (webhook) {
      if (!webhook.subscribers.includes(user.trello.userId)) {
        webhook.subscribers.push(user.trello.userId);
      }

      await this.trelloWebhookRepository.updateById(webhook.id, { subscribers: webhook.subscribers });

      if (!user.trello.webhooks.includes(webhook.id)) {
        user.trello.webhooks.push(webhook.id);
      }

      const updatedUserProps = {
        telegram: user.telegram,
        trello: {
          ...user.trello,
          webhooks: user.trello.webhooks,
        }
      }

      await this.userService.updateUserById(userId, updatedUserProps);

      return {
        message: 'Webhook already exists, user added to subscribers',
        statusCode: HttpStatus.OK,
        data: webhook,
      };
    }

    try {
      const response = await axios.post(url);
      console.log('Webhook created: ', response.data);

      const boardInfoUrl = `${trelloApiLink}/boards/${response.data.idModel}?key=${this.trelloApiKey}&token=${decryptedUserToken}`;
      const connectedBoard = await axios.get(boardInfoUrl);

      const createdWebhook = {
        ...response.data,
        boardName: connectedBoard.data.name,
        subscribers: [user.trello.userId]
      };

      const updatedUser = {
        telegram: user.telegram,
        trello: {
          ...user.trello,
          webhooks: user.trello.webhooks ? [...user.trello.webhooks, response.data.id] : [response.data.id],
        }
      };

      await Promise.all([
        this.userService.updateUserById(userId, updatedUser),
        this.trelloWebhookRepository.create(createdWebhook),
      ]);

      return {
        message: 'Webhook created successfully',
        statusCode: HttpStatus.OK,
        data: createdWebhook,
      };

    } catch (err) {
      console.error('Error creating webhook:', err.response ? err.response.data : err.message);
      throw new BadRequestException(err.response ? err.response.data : err.message);
    }
  }

  async updateTrelloWebhook(userId: string, webhookId: string, webhookUpdateDto: Webhook): Promise<DefaultResponse<Webhook>> {
    const user = await this.userService.findUserById(userId);

    const { boardName, subscribers, ...apiWebhookProperties } = webhookUpdateDto;

    const decryptedUserToken = decryptText(user.trello.token, this.encryptionKey);

    const url = `${trelloApiLink}/webhooks/${webhookId}?key=${this.trelloApiKey}&token=${decryptedUserToken}`;

    try {
      const response = await axios.put(url, apiWebhookProperties)

      const updatedWebhook = await this.trelloWebhookRepository.updateById(webhookId, { ...response.data, boardName, subscribers });

      return {
        message: `Webhook ${webhookId} updated successfully`,
        statusCode: HttpStatus.OK,
        data: updatedWebhook
      }
    } catch (err) {
      console.error('Error updating webhook:', err.response ? err.response.data : err.message);
      throw new BadRequestException(err.response ? err.response.data : err.message);
    }
  }

  async disconnectFromTrelloWebhook(userId: string, webhookId: string): Promise<DefaultResponse<null>> {
    const userToUpdate = await this.userService.findUserById(userId);
    const webhookToUpdate = await this.findWebhookById(webhookId);

    if (!userToUpdate.trello.webhooks.find(userWebhook => userWebhook === webhookId)) {
      throw new NotFoundException(`Webhook ${webhookId} not found`);
    }

    const updatedUserWebhooks = userToUpdate.trello.webhooks
      ? userToUpdate.trello.webhooks.filter(userWebhook => userWebhook !== webhookId)
      : [];

    const updatedUser = {
      trello: {
        webhooks: updatedUserWebhooks
      }
    };

    const updatedWebhookSubscribers = {
      subscribers: webhookToUpdate.subscribers ?
        webhookToUpdate.subscribers.filter(subscriberId => subscriberId !== userToUpdate.trello.userId)
        : []
    };

    await this.userService.updateUserById(userId, updatedUser);
    await this.trelloWebhookRepository.updateById(webhookId, updatedWebhookSubscribers)

    return {
      message: `Webhook ${webhookId} disconnected successfully`,
      statusCode: HttpStatus.OK,
    }
  }

  async removeTrelloWebhook(userId: string, webhookId: string): Promise<DefaultResponse<null>> {
    const user = await this.userService.findUserById(userId);

    const usersConnectedToWebhook = await this.userService.findUsersConnectedToWebhook(webhookId);

    const updatePromises = usersConnectedToWebhook.map(async (user) => {
      const updatedWebhooks = user.trello.webhooks.filter(userWebhook => userWebhook !== webhookId);
      const updatedUser = {
        telegram: user.telegram,
        trello: {
          ...user.trello,
          webhooks: updatedWebhooks,
        }
      };
      await this.userService.updateUserById(user.id, updatedUser);
    });

    await Promise.all(updatePromises);

    const decryptedUserToken = decryptText(user.trello.token, this.encryptionKey);


    try {
      await axios.delete(`${trelloApiLink}/webhooks/${webhookId}?key=${this.trelloApiKey}&token=${decryptedUserToken}`);

      await this.trelloWebhookRepository.delete(webhookId);

      return {
        message: `Webhook ${webhookId} deleted successfully from Trello and all connected users`,
        statusCode: HttpStatus.OK,
      };
    } catch (err) {
      console.error('Error updating webhook:', err.response ? err.response.data : err.message);
      throw new BadRequestException(err.response ? err.response.data : err.message);
    }
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

  async findMemberWebhooks(userId: string): Promise<Webhook[]> {
    const user = await this.userService.findUserById(userId);
    const webhooks = await this.trelloWebhookRepository.findWebhooksConnectedToUser(user.trello.userId);

    return webhooks

    // in case if you need find all webhooks from trello which is user created
    // const decryptedUserToken = decryptText(user.trello.token, this.encryptionKey);
    // const url = `${trelloApiLink}/tokens/${decryptedUserToken}/webhooks?key=${this.trelloApiKey}`;

    // try {
    //   const response = await axios.get(url);

    //   return response.data;
    // } catch (err) {
    //   console.error('Error finding members webhooks:', err.response ? err.response.data : err.message);
    //   throw new BadRequestException(err.response ? err.response.data : err.message);
    // }
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
