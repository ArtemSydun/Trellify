import { HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import { lastValueFrom } from 'rxjs';
import { HttpService } from '@nestjs/axios';
import { UserService } from 'src/user/services/user.service';
import { ConfigService } from '@nestjs/config';
import { configServiceEnum } from 'src/common/enums/config.service.enum';
import { decryptText } from 'src/common/helpers/hashing';
import { DefaultResponse } from 'src/common/interfaces/responses';

@Injectable()
export class TrelloService {
  private readonly callbackURL: string;
  private readonly encryptionKey: string;
  private readonly trelloApiKey: string;
  constructor(
    private readonly httpService: HttpService,
    private readonly userService: UserService,
    private readonly configService: ConfigService,
  ) {
    this.callbackURL = this.configService.get(configServiceEnum.NGROK_APP_LINK);
    this.encryptionKey = this.configService.get(configServiceEnum.ENCRYPTION_KEY) || '';
    this.trelloApiKey = this.configService.get(configServiceEnum.TRELLO_API_KEY) || '';
  }
  async createTrelloWebhook(userId: string, boardId: string): Promise<DefaultResponse<any>> {
    const userPersonalWebhook = `${this.callbackURL}/${userId}`;
    const user = await this.userService.findUserById(userId);
    const decryptedUserToken = decryptText(user.trelloToken, this.encryptionKey);
    const url = `https://api.trello.com/1/webhooks/?callbackURL=${userPersonalWebhook}&idModel=${boardId}&key=${user.trelloToken}&token=${decryptedUserToken}`;

    const response = lastValueFrom(this.httpService.post(url));

    if (response) {
      const updatedUser = {
        ...user,
        webhooks: [...user.webhooks, response]
      }
      await this.userService.updateUserById(userId, updatedUser);
    }

    return {
      message: `Webhook created successfully`,
      statusCode: HttpStatus.OK,
      data: response,
    }
  }

  findAll() {
    return `This action returns all trello`;
  }

  findOne(id: number) {
    return `This action returns a #${id} trello`;
  }

  update(id: number, updateTrelloDto) {
    return `This action updates a #${id} trello`;
  }

  async removeTrelloWebhook(userId: string, webhookId: string): Promise<DefaultResponse<null>> {
    const user = await this.userService.findUserById(userId);
    const updatedWebhooks = user.webhooks.filter(webhook => webhook.id !== webhookId);
    const decryptedUserToken = decryptText(user.trelloToken, this.encryptionKey);
    if (updatedWebhooks.length === user.webhooks.length) {
      throw new NotFoundException(`Webhook ${webhookId} does not exists`);
    }

    this.httpService.delete(`https://api.trello.com/1/webhooks/${webhookId}?key=${this.trelloApiKey}&token=${decryptedUserToken}`);
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
