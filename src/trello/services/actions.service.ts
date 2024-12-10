import { UsersService } from 'src/user/services/users.service';
import { ConfigService } from '@nestjs/config';
import { configServiceEnum } from 'src/common/enums/config.service.enum';
import { decryptText } from 'src/common/helpers/hashing';
import axios from 'axios';
import { TrelloWebhookRepository } from '../repositories/webhook.repository';
import { trelloApiLink, actionsEnabledByDefault } from 'src/common/constants/trello';
import { InjectBot } from 'nestjs-telegraf';
import { Context, Telegraf } from 'telegraf';
import { TrelloWebhookDetailedActions } from 'src/common/enums/trello.actions.enum';
import { toCamelCase } from 'src/common/helpers/camelCase';
import { sendMessageToUser } from 'src/common/helpers/telegram';
import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { TrelloService } from './trello.service';

/** key=APIKey is this.trelloApiKey of Trello power ups admin app key, which you can find here
 *  https://trello.com/power-ups/admin
 *  token=personal token of each user which he can get by authorizing here
 *  https://trello.com/1/authorize?expiration=never&scope=read&response_type=token&key={YourAPIKey}
 */

@Injectable()
export class ActionsService {
    private readonly webhookCallbackURL: string;
    private readonly encryptionKey: string;
    private readonly trelloApiKey: string;
    constructor(
        @InjectBot() private readonly bot: Telegraf<Context>,
        @Inject(forwardRef(() => UsersService))
        private readonly userService: UsersService,
        private readonly configService: ConfigService,
        @Inject(forwardRef(() => TrelloService))
        private readonly trelloService: TrelloService,
    ) {
        this.webhookCallbackURL = this.configService.get(configServiceEnum.BACKEND_LINK) + `/trello/webhooks`;
        this.encryptionKey = this.configService.get(configServiceEnum.ENCRYPTION_KEY) || '';
        this.trelloApiKey = this.configService.get(configServiceEnum.TRELLO_API_KEY) || '';
    }

    async handleTargetAction(targetMember: any, bot: Telegraf<Context>, webhookAction: any) {
        try {
            const targetUser = await this.userService.findUserByTrelloId(targetMember.id);
            const userInitials = targetUser.telegram?.username || targetUser.email;
            const actionType = webhookAction?.action?.display?.translationKey;
            const cardData = webhookAction?.action?.data?.card || null;
            const boardData = webhookAction?.action?.data?.board || null;
            const webhookId = webhookAction?.webhook?.id || null;
            console.log('actionType: ', actionType);
            console.log('webhookId ', webhookId);
            let message: string | null = null;

            switch (actionType) {
                case TrelloWebhookDetailedActions.CARD_MEMBER_REMOVED:
                    message = `${userInitials} you were deleted from card [${cardData.name}](https://trello.com/c/${cardData?.shortLink}/${cardData?.idShort}-${cardData?.name})`;
                    break;

                case TrelloWebhookDetailedActions.CARD_MEMBER_ADDED:
                    message = `${userInitials} you were added to card [${cardData?.name}](https://trello.com/c/${cardData?.shortLink}/${cardData?.idShort}-${cardData?.name})`;
                    break;

                case TrelloWebhookDetailedActions.BOARD_MEMBER_REMOVED:
                    message = `${userInitials} you were removed from board ${boardData?.name}`;
                    await this.trelloService.disconnectFromTrelloWebhook(targetUser.id, webhookId);
                    break;

                default:
                    console.log(`Unsupported action: ${actionType}`);
                    return;
            }

            if (message) {
                await sendMessageToUser(bot, targetUser, message);
            }

        } catch (error) {
            console.error('Error handling target action:', error);
        }
    }

}
