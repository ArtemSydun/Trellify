import { HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
// delete http service in case replacing with axios
import { HttpService } from '@nestjs/axios';
import { UserService } from 'src/user/services/user.service';
import { ConfigService } from '@nestjs/config';
import { configServiceEnum } from 'src/common/enums/config.service.enum';
import { decryptText } from 'src/common/helpers/hashing';
import { DefaultResponse } from 'src/common/interfaces/responses';
import axios from 'axios';

/** key=APIKey is this.trelloApiKey of Trello power ups admin app key, which you can find here
 *  https://trello.com/power-ups/admin
 *  token=personal token of each user which he can get by authorizing here
 *  https://trello.com/1/authorize?expiration=1day&scope=read&response_type=token&key={YourAPIKey}
 */

@Injectable()
export class TrelloService {
  private readonly callbackURL: string;
  private readonly encryptionKey: string;
  private readonly trelloApiKey: string;
  constructor(
    private readonly userService: UserService,
    private readonly configService: ConfigService,
  ) {
    this.callbackURL = this.configService.get(configServiceEnum.NGROK_APP_LINK) + `/trello/webhook`;
    this.encryptionKey = this.configService.get(configServiceEnum.ENCRYPTION_KEY) || '';
    this.trelloApiKey = this.configService.get(configServiceEnum.TRELLO_API_KEY) || '';
  }
  async createTrelloWebhook(userId: string, boardId: string): Promise<DefaultResponse<any>> {
    const userPersonalWebhookURL = `${this.callbackURL}/${userId}`;

    // Fetch user data
    const user = await this.userService.findUserById(userId);
    if (!user) {
      throw new Error(`User with ID ${userId} not found`);
    }

    // Decrypt the user token
    const decryptedUserToken = decryptText(user.trelloToken, this.encryptionKey);
    console.log('Decrypted User Token:', decryptedUserToken);

    // Construct the Trello Webhook URL
    const url = `https://api.trello.com/1/webhooks/?callbackURL=${userPersonalWebhookURL}&idModel=${boardId}&key=${this.trelloApiKey}&token=${decryptedUserToken}`;
    console.log('Trello Webhook URL:', url);

    try {
      // Send POST request to create the webhook
      const response = await axios.post(url);
      console.log('Webhook Response:', response.data);

      // If webhook creation is successful, update the user's webhooks list
      const updatedUser = {
        ...user,
        webhooks: user.webhooks ? [...user.webhooks, response.data] : [response.data],
      };

      await this.userService.updateUserById(userId, updatedUser);
      console.log('Updated User:', updatedUser);

      return {
        message: 'Webhook created successfully',
        statusCode: HttpStatus.OK,
        data: response.data,
      };

    } catch (err) {
      // Log the error response for better debugging
      console.error('Error creating webhook:', err.response ? err.response.data : err.message);
      throw new Error('Failed to create Trello webhook');
    }
  }

  async findBoardsMemberBelongsTo(userId: string, trelloMemberId: string) {
    const user = await this.userService.findUserById(userId);

    const decryptedUserToken = decryptText(user.trelloToken, this.encryptionKey);

    const url = `https://api.trello.com/1/members/${trelloMemberId}/boards?key=${this.trelloApiKey}&token=${decryptedUserToken}`;

    try {
      const response = await axios.get(url);

      return response.data;
    } catch (err) {
      console.error('Error fetching boards:', err.message);
    }
  }

  update(id: number, updateTrelloDto) {
    return `This action updates a #${id} trello`;
  }

  async removeTrelloWebhook(userId: string, webhookId: string): Promise<DefaultResponse<null>> {
    console.log(userId);
    console.log(webhookId);
    const user = await this.userService.findUserById(userId);
    const updatedWebhooks = user.webhooks ? user.webhooks.filter(webhook => webhook.id !== webhookId) : [];
    console.log(updatedWebhooks);
    const decryptedUserToken = decryptText(user.trelloToken, this.encryptionKey);
    // if (updatedWebhooks.length === user.webhooks.length) {
    //   throw new NotFoundException(`Webhook ${webhookId} does not exists`);
    // }

    await axios.delete(`https://api.trello.com/1/webhooks/${webhookId}?key=${this.trelloApiKey}&token=${decryptedUserToken}`);
    const updatedUser = {
      ...user,
      webhooks: updatedWebhooks
    };

    await this.userService.updateUserById(userId, updatedUser);

    return {
      message: `Webhook ${webhookId} deleted successfully`,
      statusCode: HttpStatus.OK,
    }
  }
}
