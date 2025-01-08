import { UsersService } from 'src/user/services/users.service';
import { TrelloWebhookAdminActions, TrelloWebhookBoardActions, TrelloWebhookCardActions, TrelloWebhookDetailedActions, TrelloWebhookPersonalActions } from 'src/trello/enums/trello.actions.enum';
import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import { TelegramService } from 'src/telegram/telegram.service';
import { Webhook } from '../../entities/webhook.entity';
import { TrelloWebhooksLogicService } from './trello.webhooks.logic.service';
import { TrelloBoard } from 'src/trello/dto/board.dto';
import { TrelloCard } from 'src/trello/dto/card.dto';

/** key=APIKey is this.trelloApiKey of Trello power ups admin app key, which you can find here
 *  https://trello.com/power-ups/admin
 *  token=personal token of each user which he can get by authorizing here
 *  https://trello.com/1/authorize?expiration=never&scope=read&response_type=token&key={YourAPIKey}
 */

@Injectable()
export class TrelloActionsLogicService {
    private readonly logger = new Logger(TrelloActionsLogicService.name);
    constructor(
        @Inject(forwardRef(() => UsersService))
        private readonly userService: UsersService,
        @Inject(forwardRef(() => TrelloWebhooksLogicService))
        private readonly trelloWebhooksLogicService: TrelloWebhooksLogicService,
        private readonly telegramService: TelegramService,
    ) {
    }

    async handlePersonalAction(
        userTrelloId: string,
        boardData: TrelloBoard,
        actionType: TrelloWebhookPersonalActions,
        webhook: string | Webhook,
        cardData?: TrelloCard,
    ) {
        try {
            const targetUser = await this.userService.findUserByTrelloId(userTrelloId);
            const userInitials = targetUser.email;

            const targetActionMessages: Partial<Record<TrelloWebhookDetailedActions, string | null>> = {
                [TrelloWebhookDetailedActions.CARD_MEMBER_REMOVED]:
                    `${userInitials} you were deleted from card [${cardData?.name}](${cardData?.url})`,
                [TrelloWebhookDetailedActions.CARD_MEMBER_ADDED]:
                    `${userInitials} you were added to card [${cardData?.name}](${cardData?.url})`,
                [TrelloWebhookDetailedActions.BOARD_MEMBER_REMOVED]:
                    `${userInitials} you were removed from board ${boardData?.name}`,
                [TrelloWebhookDetailedActions.CHECKLIST_ITEM_MEMBER_ADDED]:
                    `${userInitials} you were added to checklist in card [${cardData?.name}](${cardData?.url}).`,
                [TrelloWebhookDetailedActions.CHECKLIST_ITEM_MEMBER_REMOVED]:
                    `${userInitials} you were removed from checklist in card [${cardData?.name}](${cardData?.url}).`,
                [TrelloWebhookDetailedActions.BOARD_ADMIN_ADDED]:
                    `${userInitials} you were added to the board [${boardData?.name}](${boardData.url}) as admin`,
            }

            const message = targetActionMessages[actionType];

            if (message) {
                if (actionType === TrelloWebhookPersonalActions.BOARD_MEMBER_REMOVED) {
                    await this.trelloWebhooksLogicService.disconnectFromTrelloWebhook(targetUser, webhook);
                }
                await this.telegramService.sendMessageToUser(targetUser.telegram, message);
            } else {
                this.logger.warn(`Unsupported target action: ${actionType}`);
            }
        } catch (error) {
            this.logger.error('Error handling target action:', error.message);
        }
    }

    async handleCardActions(
        userTrelloId: string,
        cardData: TrelloCard,
        actionType: TrelloWebhookCardActions,
        webhookAction: any,
    ) {
        console.log("actionType ", actionType);
        try {
            const userToNotify = await this.userService.findUserByTrelloId(userTrelloId);

            const cardActionMessages: Record<TrelloWebhookCardActions, string | null> = {
                [TrelloWebhookDetailedActions.CARD_RENAMED]: `The card ${webhookAction?.action?.data?.old?.name} was renamed into [${cardData?.name}](${cardData?.url})`,
                [TrelloWebhookDetailedActions.CARD_ARCHIVED]: `The card [${cardData?.name}](${cardData?.url}) was archived.`,
                [TrelloWebhookDetailedActions.CARD_COMMENT_ADDED]: `A comment was added to the card [${cardData?.name}](${cardData?.url}).`,
                [TrelloWebhookDetailedActions.CARD_ATTACHMENT_ADDED]: `An attachment was added to the card [${cardData?.name}](${cardData?.url}).`,
                [TrelloWebhookDetailedActions.CARD_DUE_DATE_ADDED]: `A due date was added to the card [${cardData?.name}](${cardData?.url}).`,
                [TrelloWebhookDetailedActions.CARD_DUE_DATE_CHANGED]: `The due date on the card [${cardData?.name}](${cardData?.url}) was changed.`,
                [TrelloWebhookDetailedActions.CARD_START_DATE_ADDED]: `A start date was added to the card [${cardData?.name}](${cardData?.url}).`,
                [TrelloWebhookDetailedActions.CARD_START_DATE_CHANGED]: `The start date on the card [${cardData?.name}](${cardData?.url}) was changed.`,
                [TrelloWebhookDetailedActions.CARD_MOVED_TO_LIST]: `The card [${cardData?.name}](${cardData?.url}) was moved to another list.`,
                [TrelloWebhookDetailedActions.CARD_LABEL_ADDED]: `A label was added to the card [${cardData?.name}](${cardData?.url}).`,
                [TrelloWebhookDetailedActions.CARD_LABEL_REMOVED]: `A label was removed from the card [${cardData?.name}](${cardData?.url}).`,
                [TrelloWebhookDetailedActions.CARD_CHECKLIST_ADDED]: `A checklist was added to the card [${cardData?.name}](${cardData?.url}).`,
                [TrelloWebhookDetailedActions.CARD_CHECKLIST_REMOVED]: `A checklist was removed from the card [${cardData?.name}](${cardData?.url}).`,
                [TrelloWebhookDetailedActions.CHECKLIST_ITEM_STATE_CHANGED_COMPLETED]: `A checklist item in the card [${cardData?.name}](${cardData?.url}) was marked as completed.`,
                [TrelloWebhookDetailedActions.CHECKLIST_ITEM_STATE_CHANGED_INCOMPLETED]: `A checklist item in the card [${cardData?.name}](${cardData?.url}) was marked as incomplete.`,
                [TrelloWebhookDetailedActions.CHECKLIST_ITEM_CONVERTED_TO_CARD]: `A checklist item in the card [${cardData?.name}](${cardData?.url}) was converted into a new card.`,
                [TrelloWebhookDetailedActions.CHECKLIST_ITEM_ADDED]: `A checklist item was added in the card [${cardData?.name}](${cardData?.url}).`,
                [TrelloWebhookCardActions.CARD_MEMBER_ADDED]: `A member was added to the card [${cardData?.name}](${cardData?.url}).`,
                [TrelloWebhookCardActions.CARD_MEMBER_REMOVED]: `A member was removed from the card [${cardData?.name}](${cardData?.url}).`,
                [TrelloWebhookCardActions.CARD_MEMBER_JOINED]: `A member joined the card [${cardData?.name}](${cardData?.url}).`,
                [TrelloWebhookCardActions.CARD_MEMBER_LEFT]: `A member left the card [${cardData?.name}](${cardData?.url}).`,
                [TrelloWebhookCardActions.CHECKLIST_ITEM_DELETED]: `A checklist item was deleted from the card [${cardData?.name}](${cardData?.url}).`,
                [TrelloWebhookCardActions.CHECKLIST_ITEM_MEMBER_ADDED]: `A member was added to a checklist item in the card [${cardData?.name}](${cardData?.url}).`,
                [TrelloWebhookCardActions.CHECKLIST_ITEM_MEMBER_REMOVED]: `A member was removed from a checklist item in the card [${cardData?.name}](${cardData?.url}).`,
                [TrelloWebhookCardActions.CHECKLIST_ITEM_MEMBER_JOINED]: `A member joined checklist item in the card [${cardData?.name}](${cardData?.url}).`,
                [TrelloWebhookCardActions.CHECKLIST_ITEM_MEMBER_LEFT]: `A member left checklist item in the card [${cardData?.name}](${cardData?.url}).`,
                [TrelloWebhookCardActions.CHECKLIST_ITEM_DUE_DATE_DELETED]: `A due date was removed from a checklist item in the card [${cardData?.name}](${cardData?.url}).`,
                [TrelloWebhookCardActions.CHECKLIST_ITEM_DUE_DATE_UPDATED]: `The due date of a checklist item in the card [${cardData?.name}](${cardData?.url}) was updated.`,
                [TrelloWebhookCardActions.CUSTOM_FIELD_ITEM_UPDATED]: `A custom field in the card [${cardData?.name}](${cardData?.url}) was updated.`,
            };

            const message = cardActionMessages[actionType];

            if (message) {
                await this.telegramService.sendMessageToUser(userToNotify.telegram, message);
            } else {
                this.logger.warn(`Unsupported card action: ${actionType}`);
            }
        } catch (error) {
            this.logger.error('Error handling card action:', error);
        }
    }

    async handleBoardActions(
        userTrelloId: string,
        boardData: TrelloBoard,
        actionType: TrelloWebhookBoardActions,
    ) {
        console.log(boardData);
        try {
            const userToNotify = await this.userService.findUserByTrelloId(userTrelloId);

            const boardActionMessages: Record<TrelloWebhookBoardActions, string | null> = {
                [TrelloWebhookBoardActions.BOARD_RENAMED]: `Board was renamed into [${boardData?.name}](${boardData?.url}).`,
                [TrelloWebhookBoardActions.BOARD_CLOSED]: `Board ${boardData?.name} was closed.`,
                [TrelloWebhookBoardActions.BOARD_REOPENED]: `Board ${boardData?.name} was reopened.`,
                [TrelloWebhookBoardActions.BOARD_DELETED]: 'Board was deleted'
            };


            const message = boardActionMessages[actionType];

            if (message) {
                await this.telegramService.sendMessageToUser(userToNotify.telegram, message);
            } else {
                this.logger.warn(`Unsupported board action: ${actionType}`);
            }
        } catch (error) {
            this.logger.error('Error handling board action:', error);
        }
    }

    async handleAdminActions(
        adminTrelloId: string,
        boardData: TrelloBoard,
        actionType: TrelloWebhookAdminActions,
        targetMember?: any
    ) {
        try {
            const adminToNotify = await this.userService.findUserByTrelloId(adminTrelloId);

            const targetUser = {
                fullname: targetMember?.fullName,
                username: targetMember?.username,
            }

            const adminActionMessages: Record<TrelloWebhookAdminActions, string | null> = {
                [TrelloWebhookDetailedActions.BOARD_ADMIN_ADDED]: `A new admin was added to the board [${boardData?.name}](${boardData.url}). \n User: ${JSON.stringify(targetUser, null, 2)}`,
                [TrelloWebhookDetailedActions.BOARD_MEMBER_REMOVED]: `The user was removed from the board [${boardData?.name}](${boardData.url}). \n User: ${JSON.stringify(targetUser, null, 2)}`,
                [TrelloWebhookDetailedActions.BOARD_MEMBER_INVITATION_JOINED]: `The user joined the board [${boardData?.name}](${boardData.url}) via invitation. \n User: ${JSON.stringify(targetUser, null, 2)}`,
                [TrelloWebhookDetailedActions.BOARD_MEMBER_LEFT]: `The user left the board [${boardData?.name}](${boardData.url}). \n User: ${JSON.stringify(targetUser, null, 2)}`,
                [TrelloWebhookDetailedActions.BOARD_MEMBER_JOINED]: `A new member joined the board [${boardData?.name}](${boardData.url}). \n User: ${JSON.stringify(targetUser, null, 2)}`,
                [TrelloWebhookDetailedActions.BOARD_MEMBER_NORMAL_ROLE_ADDED]: `A new normal role was added to a user on the board [${boardData?.name}](${boardData.url}). \n User: ${JSON.stringify(targetUser, null, 2)}`,
                [TrelloWebhookAdminActions.CUSTOM_FIELD_CREATED]: '',
                [TrelloWebhookAdminActions.CUSTOM_FIELD_UPDATED]: '',
                [TrelloWebhookAdminActions.CUSTOM_FIELD_RENAMED]: ''
            };


            const message = adminActionMessages[actionType];

            if (message) {
                await this.telegramService.sendMessageToUser(adminToNotify.telegram, message);
            } else {
                this.logger.warn(`Unsupported board action: ${actionType}`);
            }
        } catch (error) {
            this.logger.error('Error handling board action:', error);
        }
    }
}
