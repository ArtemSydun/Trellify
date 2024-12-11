import { UsersService } from 'src/user/services/users.service';
import { Context, Telegraf } from 'telegraf';
import { TrelloWebhookDetailedActions } from 'src/common/enums/trello.actions.enum';
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
    constructor(
        @Inject(forwardRef(() => UsersService))
        private readonly userService: UsersService,
        @Inject(forwardRef(() => TrelloService))
        private readonly trelloService: TrelloService,
    ) {
    }

    async handleTargetAction(
        userTrelloId: string,
        bot: Telegraf<Context>,
        boardData: any,
        actionType: TrelloWebhookDetailedActions,
        webhookId: string,
        cardData?: any,
    ) {
        try {
            const targetUser = await this.userService.findUserByTrelloId(userTrelloId);
            const userInitials = targetUser.telegram?.username || targetUser.email;

            const targetActionMessages: Partial<Record<TrelloWebhookDetailedActions, string | null>> = {
                [TrelloWebhookDetailedActions.CARD_MEMBER_REMOVED]:
                    `${userInitials} you were deleted from card [${cardData?.name}](https://trello.com/c/${cardData?.shortLink}/${cardData?.idShort}-${cardData?.name})`,
                [TrelloWebhookDetailedActions.CARD_MEMBER_ADDED]:
                    `${userInitials} you were added to card [${cardData?.name}](https://trello.com/c/${cardData?.shortLink}/${cardData?.idShort}-${cardData?.name})`,
                [TrelloWebhookDetailedActions.BOARD_MEMBER_REMOVED]:
                    `${userInitials} you were removed from board ${boardData?.name}`,
            };

            const message = targetActionMessages[actionType];

            if (message) {
                if (actionType === TrelloWebhookDetailedActions.BOARD_MEMBER_REMOVED) {
                    await this.trelloService.disconnectFromTrelloWebhook(targetUser.id, webhookId);
                }
                await sendMessageToUser(bot, targetUser, message);
            } else {
                console.log(`Unsupported target action: ${actionType}`);
            }
        } catch (error) {
            console.error('Error handling target action:', error);
        }
    }

    async handleCardActions(
        userTrelloId: string, 
        bot: Telegraf<Context>, 
        cardData: any,
        actionType: TrelloWebhookDetailedActions
    ) {
        try {
            const userToNotify = await this.userService.findUserByTrelloId(userTrelloId);

            const cardActionMessages: Partial<Record<TrelloWebhookDetailedActions, string | null>> = {
                [TrelloWebhookDetailedActions.CARD_RENAMED]:
                    `The card [${cardData?.name}](https://trello.com/c/${cardData?.shortLink}/${cardData?.idShort}) was renamed.`,
                [TrelloWebhookDetailedActions.CARD_ARCHIVED]:
                    `The card [${cardData?.name}](https://trello.com/c/${cardData?.shortLink}/${cardData?.idShort}) was archived.`,
                [TrelloWebhookDetailedActions.CARD_DELETED]:
                    `The card [${cardData?.name}](https://trello.com/c/${cardData?.shortLink}/${cardData?.idShort}) was deleted.`,
                [TrelloWebhookDetailedActions.CARD_COMMENT_ADDED]:
                    `A comment was added to the card [${cardData?.name}](https://trello.com/c/${cardData?.shortLink}/${cardData?.idShort}).`,
                [TrelloWebhookDetailedActions.CARD_ATTACHMENT_ADDED]:
                    `An attachment was added to the card [${cardData?.name}](https://trello.com/c/${cardData?.shortLink}/${cardData?.idShort}).`,
                [TrelloWebhookDetailedActions.CARD_DUE_DATE_ADDED]:
                    `A due date was added to the card [${cardData?.name}](https://trello.com/c/${cardData?.shortLink}/${cardData?.idShort}).`,
                [TrelloWebhookDetailedActions.CARD_DUE_DATE_CHANGED]:
                    `The due date on the card [${cardData?.name}](https://trello.com/c/${cardData?.shortLink}/${cardData?.idShort}) was changed.`,
                [TrelloWebhookDetailedActions.CARD_START_DATE_ADDED]:
                    `A start date was added to the card [${cardData?.name}](https://trello.com/c/${cardData?.shortLink}/${cardData?.idShort}).`,
                [TrelloWebhookDetailedActions.CARD_START_DATE_CHANGED]:
                    `The start date on the card [${cardData?.name}](https://trello.com/c/${cardData?.shortLink}/${cardData?.idShort}) was changed.`,
                [TrelloWebhookDetailedActions.CARD_MOVED_TO_LIST]:
                    `The card [${cardData?.name}](https://trello.com/c/${cardData?.shortLink}/${cardData?.idShort}) was moved to another list.`,
                [TrelloWebhookDetailedActions.CARD_LABEL_ADDED]:
                    `A label was added to the card [${cardData?.name}](https://trello.com/c/${cardData?.shortLink}/${cardData?.idShort}).`,
                [TrelloWebhookDetailedActions.CARD_LABEL_REMOVED]:
                    `A label was removed from the card [${cardData?.name}](https://trello.com/c/${cardData?.shortLink}/${cardData?.idShort}).`,
                [TrelloWebhookDetailedActions.CARD_CHECKLIST_ADDED]:
                    `A checklist was added to the card [${cardData?.name}](https://trello.com/c/${cardData?.shortLink}/${cardData?.idShort}).`,
                [TrelloWebhookDetailedActions.CARD_CHECKLIST_REMOVED]:
                    `A checklist was removed from the card [${cardData?.name}](https://trello.com/c/${cardData?.shortLink}/${cardData?.idShort}).`,
                [TrelloWebhookDetailedActions.CHECKLIST_ITEM_STATE_CHANGED_COMPLETED]:
                    `A checklist item in the card [${cardData?.name}](https://trello.com/c/${cardData?.shortLink}/${cardData?.idShort}) was marked as completed.`,
                [TrelloWebhookDetailedActions.CHECKLIST_ITEM_STATE_CHANGED_INCOMPLETED]:
                    `A checklist item in the card [${cardData?.name}](https://trello.com/c/${cardData?.shortLink}/${cardData?.idShort}) was marked as incomplete.`,
                [TrelloWebhookDetailedActions.CHECKLIST_ITEM_CONVERTED_TO_CARD]:
                    `A checklist item in the card [${cardData?.name}](https://trello.com/c/${cardData?.shortLink}/${cardData?.idShort}) was converted into a new card.`,
            };

            const message = cardActionMessages[actionType];

            if (message) {
                await sendMessageToUser(bot, userToNotify, message);
            } else {
                console.log(`Unsupported card action: ${actionType}`);
            }
        } catch (error) {
            console.error('Error handling card action:', error);
        }
    }

    async handleAdminActions(
        adminTrelloId: string,
        bot: Telegraf<Context>,
        boardData: any,
        actionType: TrelloWebhookDetailedActions,
        targetMember?: any
    ) {
        try {
            const adminToNotify = await this.userService.findUserByTrelloId(adminTrelloId);

            if (!boardData) {
                console.log('No board data available in the action.');
                return;
            }

            const adminActionMessages: Partial<Record<TrelloWebhookDetailedActions, string | null>> = {
                [TrelloWebhookDetailedActions.BOARD_MEMBER_REMOVED]: `A user ${targetMember} was removed from the board [${boardData?.name}] via invitation.`,
                [TrelloWebhookDetailedActions.BOARD_MEMBER_INVITATION_JOINED]: `A user ${targetMember} joined the board [${boardData?.name}] via invitation.`,
                [TrelloWebhookDetailedActions.BOARD_MEMBER_LEFT]: `A user ${targetMember} left the board [${boardData?.name}].`,
                [TrelloWebhookDetailedActions.BOARD_MEMBER_JOINED]: `A new member ${targetMember} joined the board [${boardData?.name}].`,
                [TrelloWebhookDetailedActions.BOARD_ADMIN_ADDED]: `A new admin ${targetMember} was added to the board [${boardData?.name}].`,
                [TrelloWebhookDetailedActions.BOARD_MEMBER_NORMAL_ROLE_ADDED]: `A new normal role was added to a user ${targetMember} on the board [${boardData?.name}].`,
            };

            const message = adminActionMessages[actionType];

            if (message) {
                await sendMessageToUser(bot, adminToNotify, message);
            } else {
                console.log(`Unsupported board action: ${actionType}`);
            }
        } catch (error) {
            console.error('Error handling board action:', error);
        }
    }
}
