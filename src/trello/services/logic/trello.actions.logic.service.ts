import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TrelloWebhooksLogicService } from '@trello/logic';
import { addMinutes, format } from 'date-fns';
import { I18nService } from 'nestjs-i18n';
import * as emoji from 'node-emoji';
import { configServiceKeys } from 'src/common/enums/config-service-keys.enum';
import { I18nKeys } from 'src/common/enums/i18n-keys.enum';
import { Languages } from 'src/common/enums/languages.enum';
import { escapeMarkdown } from 'src/common/helpers/telegram';
import { notificationMessageGenerator } from 'src/common/helpers/trello-notifications';
import { DiscordService } from 'src/discord/discord.service';
import { SubscriptionService } from 'src/subscription/services/subscription.service';
import { NotificationBotService } from 'src/telegram/notification-bot/notification-bot.service';
import { TrelloBoard } from 'src/trello/dto/board.dto';
import { TrelloCard } from 'src/trello/dto/card.dto';
import {
  TrelloWebhookBoardActions,
  TrelloWebhookCardActions,
  TrelloWebhookChecklistActions,
  TrelloWebhookListActions,
  TrelloWebhookPersonalActions,
} from 'src/trello/enums/trello.actions.enum';
import { UsersService } from 'src/user/services/users.service';
import { Webhook } from '../../entities/webhook.entity';

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
    private readonly notificationBotService: NotificationBotService,
    private readonly discordService: DiscordService,
    private readonly subscriptionService: SubscriptionService,
    private readonly i18n: I18nService,
    private readonly configService: ConfigService,
  ) {}

  async handlePersonalAction(
    userTrelloId: string,
    boardData: TrelloBoard,
    actionType: TrelloWebhookPersonalActions,
    webhookAction: any,
    webhook: string | Webhook,
    cardData?: TrelloCard,
  ) {
    try {
      const targetUser =
        await this.userService.findUserByTrelloId(userTrelloId);

      const availablePlans =
        await this.subscriptionService.actionAvailablePlans(actionType);

      const checklistItemName = webhookAction?.action?.data?.checkItem?.name;
      const serverDate = new Date(webhookAction?.action?.date);
      const notificationLanguage = targetUser.language || Languages.EN;
      const actionAuthor = webhookAction?.action?.memberCreator?.username;
      const actionAuthorUrl = `https://trello.com/u/${actionAuthor}`;

      const targetMemberUsername = webhookAction?.action?.member?.username;

      const targetedChecklistUserId =
        webhookAction?.action?.data?.checkItem?.idMember ||
        webhookAction?.action?.data?.old?.idMember ||
        '';

      const targetMemberProfileUrl = `https://trello.com/u/${targetMemberUsername || targetedChecklistUserId}`;

      const userInitials = escapeMarkdown(
        `${targetUser.telegram.username || ''}`,
      )
        .replace(/@/g, '＠')
        .replace(/\./g, '.\u200B');

      const targetActionMessages: Partial<
        Record<TrelloWebhookPersonalActions, string | null>
      > = {
        [TrelloWebhookPersonalActions.CARD_MEMBER_ADDED]:
          this.i18n?.t(I18nKeys.NOTIFICATION_PERSONAL_CARD_MEMBER_ADDED, {
            lang: notificationLanguage,
            args: {
              userInitials,
              cardName: cardData?.name,
              cardUrl: cardData?.url,
            },
          }) ||
          `${userInitials} you has been deleted from card [${cardData?.name}](${cardData?.url})`,
        [TrelloWebhookPersonalActions.CARD_MEMBER_REMOVED]:
          this.i18n?.t(I18nKeys.NOTIFICATION_PERSONAL_CARD_MEMBER_REMOVED, {
            lang: notificationLanguage,
            args: {
              userInitials,
              cardName: cardData?.name,
              cardUrl: cardData?.url,
            },
          }) ||
          `${userInitials} you has been deleted from card [${cardData?.name}](${cardData?.url})`,
        [TrelloWebhookPersonalActions.BOARD_MEMBER_REMOVED]:
          this.i18n?.t(I18nKeys.NOTIFICATION_PERSONAL_BOARD_MEMBER_REMOVED, {
            lang: notificationLanguage,
            args: {
              userInitials,
              boardName: boardData?.name,
            },
          }) ||
          `${userInitials} you has been removed from board ${boardData?.name}`,
        [TrelloWebhookPersonalActions.CHECKLIST_ITEM_MEMBER_ADDED]:
          this.i18n?.t(
            I18nKeys.NOTIFICATION_PERSONAL_CHECKLIST_ITEM_MEMBER_ADDED,
            {
              lang: notificationLanguage,
              args: {
                checklistItemName,
                userInitials,
                cardName: cardData?.name,
                cardUrl: cardData?.url,
              },
            },
          ) ||
          `${userInitials} you has been added to checklist item '${checklistItemName}' in card [${cardData?.name}](${cardData?.url}).`,
        [TrelloWebhookPersonalActions.CHECKLIST_ITEM_MEMBER_REMOVED]:
          this.i18n?.t(
            I18nKeys.NOTIFICATION_PERSONAL_CHECKLIST_ITEM_MEMBER_REMOVED,
            {
              lang: notificationLanguage,
              args: {
                checklistItemName,
                userInitials,
                cardName: cardData?.name,
                cardUrl: cardData?.url,
              },
            },
          ) ||
          `${userInitials} you has been removed from checklist in card [${cardData?.name}](${cardData?.url}).`,
        [TrelloWebhookPersonalActions.BOARD_ADMIN_ADDED]:
          this.i18n?.t(I18nKeys.NOTIFICATION_PERSONAL_BOARD_ADMIN_ADDED, {
            lang: notificationLanguage,
            args: {
              userInitials,
              boardName: boardData?.name,
              boardUrl: boardData?.url,
              cardName: cardData?.name,
              cardUrl: cardData?.url,
            },
          }) ||
          `${userInitials} you has been added to the board [${boardData?.name}](${boardData?.url}) as admin`,
        [TrelloWebhookPersonalActions.BOARD_MEMBER_NORMAL_ROLE_ADDED]:
          this.i18n?.t(I18nKeys.NOTIFICATION_PERSONAL_BOARD_NORMAL_ROLE_ADDED, {
            lang: notificationLanguage,
            args: {
              userInitials,
              boardName: boardData?.name,
              boardUrl: boardData?.url,
              cardName: cardData?.name,
              cardUrl: cardData?.url,
            },
          }) ||
          `${userInitials} you has been added to the board [${boardData?.name}](${boardData?.url}) as admin`,
      };

      const message = targetActionMessages[actionType];

      if (message) {
        if (actionType === TrelloWebhookPersonalActions.BOARD_MEMBER_REMOVED) {
          await this.trelloWebhooksLogicService.disconnectFromTrelloWebhook(
            targetUser,
            webhook,
          );
        }

        if (!availablePlans.includes(targetUser.subscription.plan)) {
          this.logger.warn(
            `User ${targetUser.email} does not have subscription`,
          );
          return;
        }

        const userTimeZone = new Date(
          addMinutes(serverDate, (targetUser.timezone || 0) * 60),
        );

        const formattedTimeZone = format(
          userTimeZone,
          this.configService.get(configServiceKeys.DATE_FORMAT),
        );

        if (targetUser.telegram.chatId) {
          const formattedMessage = notificationMessageGenerator(
            targetUser,
            {
              boardName: boardData?.name,
              boardUrl: boardData?.url,
              actionDate: formattedTimeZone,
              translatedMessage: message,
              cardName: cardData?.name,
              cardUrl: cardData?.url,
              actionAuthor,
              actionAuthorUrl,
              actionTarget: targetMemberUsername || targetedChecklistUserId,
              actionTargetUrl: targetMemberProfileUrl,
            },
            this.i18n,
          );

          await this.notificationBotService.sendMessageToUser(
            targetUser.telegram,
            formattedMessage,
          );
        }

        if (targetUser.discord.userId) {
          const formattedDiscordMessage = notificationMessageGenerator(
            targetUser,
            {
              boardName: boardData?.name,
              boardUrl: `<${boardData?.url}>`,
              actionDate: formattedTimeZone,
              translatedMessage: message,
              cardName: cardData?.name,
              cardUrl: `<${cardData?.url}>`,
              actionAuthor,
              actionAuthorUrl: `<${actionAuthorUrl}>`,
              actionTarget: targetMemberUsername || targetedChecklistUserId,
              actionTargetUrl: `<${targetMemberProfileUrl}>`,
            },
            this.i18n,
          );

          await this.discordService.sendDirectMessage(
            targetUser.discord.userId,
            formattedDiscordMessage,
          );
        }
      } else {
        this.logger.warn(`Unsupported target action: ${actionType}`);
      }
    } catch (error) {
      this.logger.error('Error handling target action:', error.message);
    }
  }

  async handleCardActions(
    trelloUserIds: string[],
    boardData: TrelloBoard,
    cardData: TrelloCard,
    actionType: TrelloWebhookCardActions,
    webhookAction: any,
  ) {
    try {
      const usersToNotify =
        await this.userService.findUsersByTrelloIds(trelloUserIds);

      const availablePlans =
        await this.subscriptionService.actionAvailablePlans(actionType);

      const serverDate = new Date(webhookAction?.action?.date);

      const actionAuthor = webhookAction?.action?.memberCreator?.username;
      const actionAuthorUrl = `https://trello.com/u/${actionAuthor}`;
      const listBefore = webhookAction.action?.data?.listBefore?.name;
      const listAfter = webhookAction.action?.data?.listAfter?.name;
      const customFieldName = webhookAction.action?.data?.customField?.name;
      const oldCardName = webhookAction?.action?.data?.old?.name;

      const commentText = emoji
        .emojify(webhookAction?.action?.data?.text || '')
        .replace(/@/g, '＠')
        .replace(/\./g, '.\u200B');
      const targetMemberUsername =
        webhookAction?.action?.member?.username || '';

      const targetedChecklistUserId =
        webhookAction?.action?.data?.checkItem?.idMember ||
        webhookAction?.action?.data?.old?.idMember ||
        '';

      const targetMemberProfileUrl = `https://trello.com/u/${targetMemberUsername || targetedChecklistUserId}`;

      const cardActionMessages: Record<
        TrelloWebhookCardActions,
        (args: any) => string
      > = {
        [TrelloWebhookCardActions.CARD_CREATED]: (args) =>
          this.i18n?.t(I18nKeys.NOTIFICATION_CARD_CREATED, {
            lang: args.lang,
            args: {
              cardName: args.cardName,
              cardUrl: args.cardUrl,
              boardName: args.boardName,
              boardUrl: args.boardUrl,
            },
          }) ||
          `The new card [${cardData?.name}](${cardData?.url}) has been created on board [${boardData.name}](${boardData.url})`,

        [TrelloWebhookCardActions.CARD_RENAMED]: (args) =>
          this.i18n?.t(I18nKeys.NOTIFICATION_CARD_RENAMED, {
            lang: args.lang,
            args: {
              oldCardName: args.oldCardName,
              cardName: args.cardName,
              cardUrl: args.cardUrl,
            },
          }) ||
          `The card ${oldCardName} has been renamed into [${args.cardName}](${args.cardUrl})`,

        [TrelloWebhookCardActions.CARD_ARCHIVED]: (args) =>
          this.i18n?.t(I18nKeys.NOTIFICATION_CARD_ARCHIVED, {
            lang: args.lang,
            args: {
              cardName: args.cardName,
              cardUrl: args.cardUrl,
            },
          }) ||
          `The card [${cardData?.name}](${cardData?.url}) has been archived.`,

        [TrelloWebhookCardActions.CARD_UNARCHIVED]: (args) =>
          this.i18n?.t(I18nKeys.NOTIFICATION_CARD_UNARCHIVED, {
            lang: args.lang,
            args: {
              cardName: args.cardName,
              cardUrl: args.cardUrl,
            },
          }) ||
          `The card [${cardData?.name}](${cardData?.url}) has been unarchived.`,

        [TrelloWebhookCardActions.CARD_DESCRIPTION_CHANGED]: (args) =>
          this.i18n?.t(I18nKeys.NOTIFICATION_CARD_DESCRIPTION_CHANGED, {
            lang: args.lang,
            args: {
              cardName: args.cardName,
              cardUrl: args.cardUrl,
            },
          }) ||
          `The card ${cardData?.name} description changed on board [${boardData.name}](${boardData.url})`,

        [TrelloWebhookCardActions.CARD_MEMBER_ADDED]: (args) =>
          this.i18n?.t(I18nKeys.NOTIFICATION_CARD_MEMBER_ADDED, {
            lang: args.lang,
            args: {
              memberName: args.memberName,
              memberUrl: args.memberUrl,
              cardName: args.cardName,
              cardUrl: args.cardUrl,
            },
          }) ||
          `A member [${targetMemberUsername}](${targetMemberProfileUrl}) has been added to the card [${cardData?.name}](${cardData?.url}).`,

        [TrelloWebhookCardActions.CARD_MEMBER_REMOVED]: (args) =>
          this.i18n?.t(I18nKeys.NOTIFICATION_CARD_MEMBER_REMOVED, {
            lang: args.lang,
            args: {
              memberName: args.memberName,
              memberUrl: args.memberUrl,
              cardName: args.cardName,
              cardUrl: args.cardUrl,
            },
          }) ||
          `A member [${targetMemberUsername}](${targetMemberProfileUrl}) has been removed from the card [${cardData?.name}](${cardData?.url}).`,

        [TrelloWebhookCardActions.CARD_MEMBER_JOINED]: (args) =>
          this.i18n?.t(I18nKeys.NOTIFICATION_CARD_MEMBER_JOINED, {
            lang: args.lang,
            args: {
              memberName: args.memberName,
              memberUrl: args.memberUrl,
              cardName: args.cardName,
              cardUrl: args.cardUrl,
            },
          }) ||
          `A member [${targetMemberUsername}](${targetMemberProfileUrl}) has joined the card [${cardData?.name}](${cardData?.url}).`,

        [TrelloWebhookCardActions.CARD_MEMBER_LEFT]: (args) =>
          this.i18n?.t(I18nKeys.NOTIFICATION_CARD_MEMBER_LEFT, {
            lang: args.lang,
            args: {
              memberName: args.memberName,
              memberUrl: args.memberUrl,
              cardName: args.cardName,
              cardUrl: args.cardUrl,
            },
          }) ||
          `A member [${targetMemberUsername}](${targetMemberProfileUrl}) has left the card [${cardData?.name}](${cardData?.url}).`,

        [TrelloWebhookCardActions.CARD_START_DATE_ADDED]: (args) =>
          this.i18n?.t(I18nKeys.NOTIFICATION_CARD_START_DATE_ADDED, {
            lang: args.lang,
            args: {
              cardName: args.cardName,
              cardUrl: args.cardUrl,
            },
          }) ||
          `A start date has been added to the card [${cardData?.name}](${cardData?.url}).`,

        [TrelloWebhookCardActions.CARD_START_DATE_CHANGED]: (args) =>
          this.i18n?.t(I18nKeys.NOTIFICATION_CARD_START_DATE_CHANGED, {
            lang: args.lang,
            args: {
              cardName: args.cardName,
              cardUrl: args.cardUrl,
            },
          }) ||
          `The start date on the card [${cardData?.name}](${cardData?.url}) has been changed.`,

        [TrelloWebhookCardActions.CARD_START_DATE_REMOVED]: (args) =>
          this.i18n?.t(I18nKeys.NOTIFICATION_CARD_START_DATE_CHANGED, {
            lang: args.lang,
            args: {
              cardName: args.cardName,
              cardUrl: args.cardUrl,
            },
          }) ||
          `The start date on the card [${cardData?.name}](${cardData?.url}) has been changed.`,

        [TrelloWebhookCardActions.CARD_DUE_DATE_ADDED]: (args) =>
          this.i18n?.t(I18nKeys.NOTIFICATION_CARD_DUE_DATE_ADDED, {
            lang: args.lang,
            args: {
              cardName: args.cardName,
              cardUrl: args.cardUrl,
            },
          }) ||
          `A due date has been added to the card [${cardData?.name}](${cardData?.url}).`,

        [TrelloWebhookCardActions.CARD_DUE_DATE_CHANGED]: (args) =>
          this.i18n?.t(I18nKeys.NOTIFICATION_CARD_DUE_DATE_CHANGED, {
            lang: args.lang,
            args: {
              cardName: args.cardName,
              cardUrl: args.cardUrl,
            },
          }) ||
          `The due date on the card [${cardData?.name}](${cardData?.url}) has been changed.`,

        [TrelloWebhookCardActions.CARD_DUE_DATE_REMOVED]: (args) =>
          this.i18n?.t(I18nKeys.NOTIFICATION_CARD_DUE_DATE_CHANGED, {
            lang: args.lang,
            args: {
              cardName: args.cardName,
              cardUrl: args.cardUrl,
            },
          }) ||
          `The due date on the card [${cardData?.name}](${cardData?.url}) has been changed.`,

        [TrelloWebhookCardActions.CARD_DUE_DATE_MARKED_COMPLETE]: (args) =>
          this.i18n?.t(I18nKeys.NOTIFICATION_CARD_DUE_DATE_MARKED_COMPLETED, {
            lang: args.lang,
            args: {
              cardName: args.cardName,
              cardUrl: args.cardUrl,
            },
          }) ||
          `The due date on the card [${cardData?.name}](${cardData?.url}) marked as completed.`,
        [TrelloWebhookCardActions.CARD_DUE_DATE_MARKED_INCOMPLETE]: (args) =>
          this.i18n?.t(I18nKeys.NOTIFICATION_CARD_DUE_DATE_MARKED_INCOMPLETED, {
            lang: args.lang,
            args: {
              cardName: args.cardName,
              cardUrl: args.cardUrl,
            },
          }) ||
          `The due date on the card [${cardData?.name}](${cardData?.url}) marked as incompleted.`,

        [TrelloWebhookCardActions.CARD_MOVED_TO_LIST]: (args) =>
          this.i18n?.t(I18nKeys.NOTIFICATION_CARD_MOVED_TO_LIST, {
            lang: args.lang,
            args: {
              cardName: args.cardName,
              cardUrl: args.cardUrl,
              listBefore: args.listBefore,
              listAfter: args.listAfter,
            },
          }) ||
          `The card [${cardData?.name}](${cardData?.url}) has been moved from ${listBefore} to ${listAfter}.`,

        [TrelloWebhookCardActions.CARD_MOVED_FROM_BOARD]: (args) =>
          this.i18n?.t(I18nKeys.NOTIFICATION_CARD_MOVED_FROM_BOARD, {
            lang: args.lang,
            args: {
              cardName: args.cardName,
              cardUrl: args.cardUrl,
            },
          }) ||
          `The card [${cardData?.name}](${cardData?.url}) has been moved from board.`,
        [TrelloWebhookCardActions.CARD_MOVED_TO_BOARD]: (args) =>
          this.i18n?.t(I18nKeys.NOTIFICATION_CARD_MOVED_TO_BOARD, {
            lang: args.lang,
            args: {
              cardName: args.cardName,
              cardUrl: args.cardUrl,
            },
          }) ||
          `The card [${cardData?.name}](${cardData?.url}) has been moved to board.`,

        [TrelloWebhookCardActions.CARD_COMMENT_ADDED]: (args) =>
          this.i18n?.t(I18nKeys.NOTIFICATION_CARD_COMMENT_ADDED, {
            lang: args.lang,
            args: {
              actionAuthor,
              actionAuthorUrl,
              commentText: args.commentText,
              cardName: args.cardName,
              cardUrl: args.cardUrl,
            },
          }) ||
          `A comment '${commentText}' has been added to the card [${cardData?.name}](${cardData?.url}).`,

        [TrelloWebhookCardActions.CARD_ATTACHMENT_ADDED]: (args) =>
          this.i18n?.t(I18nKeys.NOTIFICATION_CARD_ATTACHMENT_ADDED, {
            lang: args.lang,
            args: {
              cardName: args.cardName,
              cardUrl: args.cardUrl,
            },
          }) ||
          `An attachment has been added to the card [${cardData?.name}](${cardData?.url}).`,

        [TrelloWebhookCardActions.CARD_ATTACHMENT_REMOVED]: (args) =>
          this.i18n?.t(I18nKeys.NOTIFICATION_CARD_ATTACHMENT_REMOVED, {
            lang: args.lang,
            args: {
              cardName: args.cardName,
              cardUrl: args.cardUrl,
            },
          }) ||
          `An attachment has been removed from the card [${cardData?.name}](${cardData?.url}).`,

        [TrelloWebhookCardActions.CARD_LABEL_ADDED]: (args) =>
          this.i18n?.t(I18nKeys.NOTIFICATION_CARD_LABEL_ADDED, {
            lang: args.lang,
            args: {
              cardName: args.cardName,
              cardUrl: args.cardUrl,
            },
          }) ||
          `A label has been added to the card [${cardData?.name}](${cardData?.url}).`,

        [TrelloWebhookCardActions.CARD_LABEL_REMOVED]: (args) =>
          this.i18n?.t(I18nKeys.NOTIFICATION_CARD_LABEL_REMOVED, {
            lang: args.lang,
            args: {
              cardName: args.cardName,
              cardUrl: args.cardUrl,
            },
          }) ||
          `A label has been removed from the card [${cardData?.name}](${cardData?.url}).`,

        [TrelloWebhookCardActions.CUSTOM_FIELD_ITEM_UPDATED]: (args) =>
          this.i18n?.t(I18nKeys.NOTIFICATION_CUSTOM_FIELD_ITEM_UPDATED, {
            lang: args.lang,
            args: {
              customFieldName: args.customFieldName,
              cardName: args.cardName,
              cardUrl: args.cardUrl,
            },
          }) ||
          `${customFieldName} status in the card [${cardData?.name}](${cardData?.url}) has been updated.`,
      };

      const userPromises = usersToNotify.map(async (userToNotify) => {
        if (!availablePlans.includes(userToNotify.subscription.plan)) {
          this.logger.warn(
            `User ${userToNotify.email} does not have subscription`,
          );
          return;
        }

        const userLanguage = userToNotify.language || Languages.EN;

        const userTimeZone = new Date(
          addMinutes(serverDate, (userToNotify.timezone || 0) * 60),
        );

        const formattedTimeZone = format(
          userTimeZone,
          this.configService.get(configServiceKeys.DATE_FORMAT),
        );

        const message = cardActionMessages[actionType]({
          lang: userLanguage,
          actionAuthor,
          actionAuthorUrl,
          memberName: targetMemberUsername || targetedChecklistUserId,
          memberUrl: targetMemberProfileUrl,
          commentText,
          customFieldName,
          oldCardName,
          boardName: boardData?.name,
          boardUrl: boardData?.url,
          cardName: cardData?.name,
          cardUrl: cardData?.url,
          listBefore,
          listAfter,
        });

        if (message) {
          if (!message) {
            this.logger.warn(`Unsupported card action: ${actionType}`);
            return;
          }

          if (userToNotify.telegram.chatId) {
            const formattedTelegramMessage = notificationMessageGenerator(
              userToNotify,
              {
                boardName: boardData?.name,
                boardUrl: boardData?.url,
                actionDate: formattedTimeZone,
                translatedMessage: message,
                cardName: cardData.name,
                cardUrl: cardData.url,
                actionAuthor,
                actionAuthorUrl,
                actionTarget: targetMemberUsername || targetedChecklistUserId,
                actionTargetUrl: targetMemberProfileUrl,
              },
              this.i18n,
            );

            await this.notificationBotService.sendMessageToUser(
              userToNotify.telegram,
              formattedTelegramMessage,
            );
          }

          if (userToNotify.discord.userId) {
            // < and > added to URLS to avoid discord links preview
            const formattedDiscordMessage = notificationMessageGenerator(
              userToNotify,
              {
                boardName: boardData?.name,
                boardUrl: `<${boardData?.url}>`,
                actionDate: formattedTimeZone,
                translatedMessage: message,
                cardName: cardData.name,
                cardUrl: `<${cardData.url}>`,
                actionAuthor,
                actionAuthorUrl: `<${actionAuthorUrl}>`,
                actionTarget: targetMemberUsername || targetedChecklistUserId,
                actionTargetUrl: `<${targetMemberProfileUrl}>`,
              },
              this.i18n,
            );

            await this.discordService.sendDirectMessage(
              userToNotify.discord.userId,
              formattedDiscordMessage,
            );
          }
        }
      });

      await Promise.all(userPromises);
    } catch (error) {
      this.logger.error('Error handling card action:', error);
    }
  }

  async handleChecklistActions(
    trelloUserIds: string[],
    boardData: TrelloBoard,
    cardData: TrelloCard,
    actionType: TrelloWebhookChecklistActions,
    webhookAction: any,
  ) {
    try {
      const usersToNotify =
        await this.userService.findUsersByTrelloIds(trelloUserIds);

      const availablePlans =
        await this.subscriptionService.actionAvailablePlans(actionType);

      const serverDate = new Date(webhookAction?.action?.date);
      const checklistItemName = webhookAction?.action?.data?.checkItem?.name;
      const oldChecklistItemName = webhookAction?.action?.data?.old?.name;

      const checklistName = webhookAction?.action?.data?.checklist?.name;
      const oldChecklistName = webhookAction?.action?.data?.old?.name;

      const actionAuthor = webhookAction?.action?.memberCreator?.username;
      const actionAuthorUrl = `https://trello.com/u/${actionAuthor}`;

      const targetMemberUsername =
        webhookAction?.action?.member?.username || '';

      const targetedChecklistUserId =
        webhookAction?.action?.data?.checkItem?.idMember ||
        webhookAction?.action?.data?.old?.idMember ||
        '';

      const targetMemberProfileUrl = `https://trello.com/u/${targetMemberUsername || targetedChecklistUserId}`;

      const cardActionMessages: Record<
        TrelloWebhookChecklistActions,
        (args: any) => string
      > = {
        [TrelloWebhookChecklistActions.CHECKLIST_ADDED]: (args) =>
          this.i18n?.t(I18nKeys.NOTIFICATION_CHECKLIST_ADDED, {
            lang: args.lang,
            args: {
              cardName: args.cardName,
              cardUrl: args.cardUrl,
            },
          }) ||
          `A checklist has been added to the card [${cardData?.name}](${cardData?.url}).`,

        [TrelloWebhookChecklistActions.CHECKLIST_REMOVED]: (args) =>
          this.i18n?.t(I18nKeys.NOTIFICATION_CHECKLIST_REMOVED, {
            lang: args.lang,
            args: {
              cardName: args.cardName,
              cardUrl: args.cardUrl,
            },
          }) ||
          `A checklist has been removed from the card [${cardData?.name}](${cardData?.url}).`,

        [TrelloWebhookChecklistActions.CHECKLIST_RENAMED]: (args) =>
          this.i18n?.t(I18nKeys.NOTIFICATION_CHECKLIST_RENAMED, {
            lang: args.lang,
            args: {
              oldChecklistName: args.oldChecklistName,
              checklistName: args.checklistName,
              cardName: args.cardName,
              cardUrl: args.cardUrl,
            },
          }) ||
          `A checklist has been renamed from the card [${cardData?.name}](${cardData?.url}).`,

        [TrelloWebhookChecklistActions.CHECKLIST_ITEM_ADDED]: (args) =>
          this.i18n?.t(I18nKeys.NOTIFICATION_CHECKLIST_ITEM_ADDED, {
            lang: args.lang,
            args: {
              checklistItemName: args.checklistItemName,
              cardName: args.cardName,
              cardUrl: args.cardUrl,
            },
          }) ||
          `A checklist item '${checklistItemName}' has been added in the card [${cardData?.name}](${cardData?.url}).`,

        [TrelloWebhookChecklistActions.CHECKLIST_ITEM_DELETED]: (args) =>
          this.i18n?.t(I18nKeys.NOTIFICATION_CHECKLIST_ITEM_DELETED, {
            lang: args.lang,
            args: {
              checklistItemName: args.checklistItemName,
              cardName: args.cardName,
              cardUrl: args.cardUrl,
            },
          }) ||
          `A checklist item '${checklistItemName}' has been deleted from the card [${cardData?.name}](${cardData?.url}).`,

        [TrelloWebhookChecklistActions.CHECKLIST_ITEM_RENAMED]: (args) =>
          this.i18n?.t(I18nKeys.NOTIFICATION_CHECKLIST_ITEM_RENAMED, {
            lang: args.lang,
            args: {
              oldChecklistItemName: args.oldChecklistItemName,
              checklistItemName: args.checklistItemName,
              cardName: args.cardName,
              cardUrl: args.cardUrl,
            },
          }) ||
          `A checklist has been renamed from the card [${cardData?.name}](${cardData?.url}).`,

        [TrelloWebhookChecklistActions.CHECKLIST_ITEM_STATE_CHANGED_COMPLETED]:
          (args) =>
            this.i18n?.t(
              I18nKeys.NOTIFICATION_CHECKLIST_ITEM_STATE_CHANGED_COMPLETED,
              {
                lang: args.lang,
                args: {
                  checklistItemName: args.checklistItemName,
                  cardName: args.cardName,
                  cardUrl: args.cardUrl,
                },
              },
            ) ||
            `The checklist item, '${checklistItemName}', in the card [${args.cardName}](${args.cardUrl}) has been marked as completed.`,

        [TrelloWebhookChecklistActions.CHECKLIST_ITEM_STATE_CHANGED_INCOMPLETED]:
          (args) =>
            this.i18n?.t(
              I18nKeys.NOTIFICATION_CHECKLIST_ITEM_STATE_CHANGED_INCOMPLETED,
              {
                lang: args.lang,
                args: {
                  checklistItemName: args.checklistItemName,
                  cardName: args.cardName,
                  cardUrl: args.cardUrl,
                },
              },
            ) ||
            `A checklist item '${checklistItemName}' in the card [${cardData?.name}](${cardData?.url}) has been marked as incompleted.`,

        [TrelloWebhookChecklistActions.CHECKLIST_ITEM_CONVERTED_TO_CARD]: (
          args,
        ) =>
          this.i18n?.t(I18nKeys.NOTIFICATION_CHECKLIST_ITEM_CONVERTED_TO_CARD, {
            lang: args.lang,
            args: {
              cardName: args.cardName,
              cardUrl: args.cardUrl,
            },
          }) ||
          `A checklist item '${checklistItemName}' in the card [${cardData?.name}](${cardData?.url}) has been converted into a new card.`,

        [TrelloWebhookChecklistActions.CHECKLIST_ITEM_MEMBER_ADDED]: (args) =>
          this.i18n?.t(I18nKeys.NOTIFICATION_CHECKLIST_ITEM_MEMBER_ADDED, {
            lang: args.lang,
            args: {
              memberName: args.memberName,
              memberUrl: args.memberUrl,
              checklistItemName: args.checklistItemName,
              cardName: args.cardName,
              cardUrl: args.cardUrl,
            },
          }) ||
          `A member [${targetedChecklistUserId}](${targetedChecklistUserId}) has been added to a checklist item '${checklistItemName}' in the card [${cardData?.name}](${cardData?.url}).`,

        [TrelloWebhookChecklistActions.CHECKLIST_ITEM_MEMBER_REMOVED]: (args) =>
          this.i18n?.t(I18nKeys.NOTIFICATION_CHECKLIST_ITEM_MEMBER_REMOVED, {
            lang: args.lang,
            args: {
              memberName: args.memberName,
              memberUrl: args.memberUrl,
              checklistItemName: args.checklistItemName,
              cardName: args.cardName,
              cardUrl: args.cardUrl,
            },
          }) ||
          `A member [${targetedChecklistUserId}](${targetMemberProfileUrl}) has been removed from a checklist item '${checklistItemName}' in the card [${cardData?.name}](${cardData?.url}).`,

        [TrelloWebhookChecklistActions.CHECKLIST_ITEM_MEMBER_JOINED]: (args) =>
          this.i18n?.t(I18nKeys.NOTIFICATION_CHECKLIST_ITEM_MEMBER_JOINED, {
            lang: args.lang,
            args: {
              memberName: args.memberName,
              memberUrl: args.memberUrl,
              checklistItemName: args.checklistItemName,
              cardName: args.cardName,
              cardUrl: args.cardUrl,
            },
          }) ||
          `A member [${targetMemberUsername}](${targetMemberProfileUrl}) has joined checklist item '${checklistItemName}' in the card [${cardData?.name}](${cardData?.url}).`,

        [TrelloWebhookChecklistActions.CHECKLIST_ITEM_MEMBER_LEFT]: (args) =>
          this.i18n?.t(I18nKeys.NOTIFICATION_CHECKLIST_ITEM_MEMBER_LEFT, {
            lang: args.lang,
            args: {
              memberName: args.memberName,
              memberUrl: args.memberUrl,
              checklistItemName: args.checklistItemName,
              cardName: args.cardName,
              cardUrl: args.cardUrl,
            },
          }) ||
          `A member [${targetMemberUsername}](${targetMemberProfileUrl}) has left checklist item '${checklistItemName}' in the card [${cardData?.name}](${cardData?.url}).`,

        [TrelloWebhookChecklistActions.CHECKLIST_ITEM_DUE_DATE_DELETED]: (
          args,
        ) =>
          this.i18n?.t(I18nKeys.NOTIFICATION_CHECKLIST_ITEM_DUE_DATE_DELETED, {
            lang: args.lang,
            args: {
              checklistItemName: args.checklistItemName,
              cardName: args.cardName,
              cardUrl: args.cardUrl,
            },
          }) ||
          `A due date has been removed from a checklist item ${checklistItemName} in the card [${cardData?.name}](${cardData?.url}).`,

        [TrelloWebhookChecklistActions.CHECKLIST_ITEM_DUE_DATE_UPDATED]: (
          args,
        ) =>
          this.i18n?.t(I18nKeys.NOTIFICATION_CHECKLIST_ITEM_DUE_DATE_UPDATED, {
            lang: args.lang,
            args: {
              checklistItemName: args.checklistItemName,
              cardName: args.cardName,
              cardUrl: args.cardUrl,
            },
          }) ||
          `The due date of a checklist item ${checklistItemName} in the card [${cardData?.name}](${cardData?.url}) has been updated.`,
      };

      const userPromises = usersToNotify.map(async (userToNotify) => {
        if (!availablePlans.includes(userToNotify.subscription.plan)) {
          this.logger.warn(
            `User ${userToNotify.email} does not have subscription`,
          );
          return;
        }

        const userLanguage = userToNotify.language || Languages.EN;

        const userTimeZone = new Date(
          addMinutes(serverDate, (userToNotify.timezone || 0) * 60),
        );

        const formattedTimeZone = format(
          userTimeZone,
          this.configService.get(configServiceKeys.DATE_FORMAT),
        );

        const message = cardActionMessages[actionType]({
          lang: userLanguage,
          actionAuthor,
          actionAuthorUrl,
          memberName: targetMemberUsername || targetedChecklistUserId,
          memberUrl: targetMemberProfileUrl,

          boardName: boardData?.name,
          boardUrl: boardData?.url,
          cardName: cardData?.name,
          cardUrl: cardData?.url,
          oldChecklistName,
          checklistName,
          oldChecklistItemName,
          checklistItemName,
        });

        if (message) {
          if (!message) {
            this.logger.warn(`Unsupported card action: ${actionType}`);
            return;
          }

          if (userToNotify.telegram.chatId) {
            const formattedTelegramMessage = notificationMessageGenerator(
              userToNotify,
              {
                boardName: boardData?.name,
                boardUrl: boardData?.url,
                actionDate: formattedTimeZone,
                translatedMessage: message,
                cardName: cardData.name,
                cardUrl: cardData.url,
                actionAuthor,
                actionAuthorUrl,
                actionTarget: targetMemberUsername || targetedChecklistUserId,
                actionTargetUrl: targetMemberProfileUrl,
              },
              this.i18n,
            );

            await this.notificationBotService.sendMessageToUser(
              userToNotify.telegram,
              formattedTelegramMessage,
            );
          }

          if (userToNotify.discord.userId) {
            // < and > added to URLS to avoid discord links preview
            const formattedDiscordMessage = notificationMessageGenerator(
              userToNotify,
              {
                boardName: boardData?.name,
                boardUrl: `<${boardData?.url}>`,
                actionDate: formattedTimeZone,
                translatedMessage: message,
                cardName: cardData.name,
                cardUrl: `<${cardData.url}>`,
                actionAuthor,
                actionAuthorUrl: `<${actionAuthorUrl}>`,
                actionTarget: targetMemberUsername || targetedChecklistUserId,
                actionTargetUrl: `<${targetMemberProfileUrl}>`,
              },
              this.i18n,
            );

            await this.discordService.sendDirectMessage(
              userToNotify.discord.userId,
              formattedDiscordMessage,
            );
          }
        }
      });

      await Promise.all(userPromises);
    } catch (error) {
      this.logger.error('Error handling card action:', error);
    }
  }

  async handleListActions(
    userTrelloIds: string[],
    boardData: TrelloBoard,
    actionType: TrelloWebhookListActions,
    webhookAction: any,
  ) {
    try {
      const usersToNotify =
        await this.userService.findUsersByTrelloIds(userTrelloIds);

      const availablePlans =
        await this.subscriptionService.actionAvailablePlans(actionType);

      const listName = webhookAction?.action?.data?.list?.name;
      const oldListName = webhookAction?.action?.data?.old?.name;

      const serverDate = new Date(webhookAction?.action?.date);

      const actionAuthor = webhookAction?.action?.memberCreator?.username;
      const actionAuthorUrl = `https://trello.com/u/${actionAuthor}`;

      const listActionMessages: Partial<
        Record<TrelloWebhookListActions, (args: any) => string>
      > = {
        [TrelloWebhookListActions.LIST_CREATED]: (args) =>
          this.i18n?.t(I18nKeys.NOTIFICATION_LIST_CREATED, {
            lang: args.lang,
            args: {
              listName,
              boardName: boardData?.name,
              boardUrl: boardData?.url,
            },
          }) ||
          `The list ${listName} has been created on board [${boardData?.name}](${boardData?.url}).`,
        [TrelloWebhookListActions.LIST_RENAMED]: (args) =>
          this.i18n?.t(I18nKeys.NOTIFICATION_LIST_RENAMED, {
            lang: args.lang,
            args: {
              listName,
              oldListName,
              boardName: boardData?.name,
              boardUrl: boardData?.url,
            },
          }) ||
          `The list ${oldListName} has been renamed into ${listName} on board [${boardData?.name}](${boardData?.url}).`,
        [TrelloWebhookListActions.LIST_ARCHIVED]: (args) =>
          this.i18n?.t(I18nKeys.NOTIFICATION_LIST_ARCHIVED, {
            lang: args.lang,
            args: {
              listName,
              boardName: boardData?.name,
              boardUrl: boardData?.url,
            },
          }) ||
          `The list ${listName} has been archived on board [${boardData?.name}](${boardData?.url}).`,
        [TrelloWebhookListActions.LIST_UNARCHIVED]: (args) =>
          this.i18n?.t(I18nKeys.NOTIFICATION_LIST_UNARCHIVED, {
            lang: args.lang,
            args: {
              listName,
              boardName: boardData?.name,
              boardUrl: boardData?.url,
            },
          }) ||
          `The list ${listName} has been unarchived on board [${boardData?.name}](${boardData?.url}).`,
        [TrelloWebhookListActions.LIST_DELETED]: (args) =>
          this.i18n?.t(I18nKeys.NOTIFICATION_LIST_DELETED, {
            lang: args.lang,
            args: {
              listName,
              boardName: boardData?.name,
              boardUrl: boardData?.url,
            },
          }) ||
          `The list ${listName} has been deleted from the board [${boardData?.name}](${boardData?.url}).`,
      };

      const userPromises = usersToNotify.map(async (userToNotify) => {
        if (!availablePlans.includes(userToNotify.subscription.plan)) {
          this.logger.warn(
            `User ${userToNotify.email} does not have subscription`,
          );
          return;
        }

        const userLanguage = userToNotify.language || Languages.EN;

        const userTimeZone = new Date(
          addMinutes(serverDate, (userToNotify.timezone || 0) * 60),
        );

        const formattedTimeZone = format(
          userTimeZone,
          this.configService.get(configServiceKeys.DATE_FORMAT),
        );

        const message = listActionMessages[actionType]({
          lang: userLanguage,
          boardName: boardData?.name,
          boardUrl: boardData?.url,
          actionDate: formattedTimeZone,
          actionAuthor,
          actionAuthorUrl,
        });

        if (!message) {
          this.logger.warn(`Unsupported card action: ${actionType}`);
          return;
        }

        if (userToNotify.telegram?.chatId) {
          const formattedTelegramMessage = notificationMessageGenerator(
            userToNotify,
            {
              boardName: boardData?.name,
              boardUrl: boardData?.url,
              actionDate: formattedTimeZone,
              translatedMessage: message,
              actionAuthor,
              actionAuthorUrl,
            },
            this.i18n,
          );

          await this.notificationBotService.sendMessageToUser(
            userToNotify.telegram,
            formattedTelegramMessage,
          );
        }

        if (userToNotify.discord?.userId) {
          const formattedTelegramMessage = notificationMessageGenerator(
            userToNotify,
            {
              boardName: boardData?.name,
              boardUrl: `<${boardData?.url}>`,
              actionDate: formattedTimeZone,
              translatedMessage: message,
              actionAuthor,
              actionAuthorUrl: `<${actionAuthorUrl}>`,
            },
            this.i18n,
          );

          await this.discordService.sendDirectMessage(
            userToNotify.discord?.userId,
            formattedTelegramMessage,
          );
        }
      });

      await Promise.all(userPromises);
    } catch (error) {
      this.logger.error('Error handling board action:', error);
    }
  }

  async handleBoardActions(
    userTrelloIds: string[],
    boardData: TrelloBoard,
    actionType: TrelloWebhookBoardActions,
    webhookAction: any,
  ) {
    try {
      const usersToNotify =
        await this.userService.findUsersByTrelloIds(userTrelloIds);

      const availablePlans =
        await this.subscriptionService.actionAvailablePlans(actionType);

      const oldBoardName = webhookAction?.action?.data?.old?.name;

      const serverDate = new Date(webhookAction?.action?.date);

      const actionAuthor = webhookAction?.action?.memberCreator?.username;
      const actionAuthorUrl = `https://trello.com/u/${actionAuthor}`;

      const targetMemberUsername =
        webhookAction?.action?.member?.username || '';
      const targetMemberProfileUrl = `https://trello.com/u/${targetMemberUsername}`;

      const oldCustomFieldName = webhookAction.action?.data?.old?.name;
      const customFieldName = webhookAction.action?.data?.customField?.name;
      const permissionLevel =
        webhookAction.action?.data?.board?.prefs?.permissionLevel;

      const boardActionMessages: Record<
        TrelloWebhookBoardActions,
        (args: any) => string
      > = {
        [TrelloWebhookBoardActions.BOARD_RENAMED]: (args) =>
          this.i18n?.t(I18nKeys.NOTIFICATION_BOARD_RENAMED, {
            lang: args.lang,
            args: {
              oldBoardName,
              boardName: boardData?.name,
              boardUrl: boardData?.url,
            },
          }) ||
          `Board ${oldBoardName} has been renamed into [${boardData?.name}](${boardData?.url}).`,

        [TrelloWebhookBoardActions.BOARD_CLOSED]: (args) =>
          this.i18n?.t(I18nKeys.NOTIFICATION_BOARD_CLOSED, {
            lang: args.lang,
            args: {
              boardName: boardData?.name,
            },
          }) || `Board ${boardData?.name} has been closed.`,

        [TrelloWebhookBoardActions.BOARD_REOPENED]: (args) =>
          this.i18n?.t(I18nKeys.NOTIFICATION_BOARD_REOPENED, {
            lang: args.lang,
            args: {
              boardName: boardData?.name,
              boardUrl: boardData?.url,
            },
          }) ||
          `Board [${boardData?.name}](${boardData?.url}) has been reopened.`,
        [TrelloWebhookBoardActions.BOARD_ADMIN_ADDED]: (args) =>
          this.i18n?.t(I18nKeys.NOTIFICATION_BOARD_ADMIN_ADDED, {
            lang: args.lang,
            args: {
              memberName: args.memberName,
              memberUrl: args.memberUrl,
              boardName: args.boardName,
              boardUrl: args.boardUrl,
            },
          }) ||
          `A new admin [${targetMemberUsername}](${targetMemberProfileUrl}) has been added on the board [${boardData?.name}](${boardData?.url}).`,

        [TrelloWebhookBoardActions.BOARD_MEMBER_REMOVED]: (args) =>
          this.i18n?.t(I18nKeys.NOTIFICATION_BOARD_MEMBER_REMOVED, {
            lang: args.lang,
            args: {
              memberName: args.memberName,
              memberUrl: args.memberUrl,
              boardName: args.boardName,
              boardUrl: args.boardUrl,
            },
          }) ||
          `The user [${targetMemberUsername}](${targetMemberProfileUrl}) has been removed from the board  [${boardData?.name}](${boardData?.url}).`,

        [TrelloWebhookBoardActions.BOARD_MEMBER_INVITATION_JOINED]: (args) =>
          this.i18n?.t(I18nKeys.NOTIFICATION_BOARD_MEMBER_INVITATION_JOINED, {
            lang: args.lang,
            args: {
              memberName: args.memberName,
              memberUrl: args.memberUrl,
              boardName: args.boardName,
              boardUrl: args.boardUrl,
            },
          }) ||
          `The user [${targetMemberUsername}](${targetMemberProfileUrl}) has joined the board [${boardData?.name}](${boardData?.url}) via invitation.`,

        [TrelloWebhookBoardActions.BOARD_MEMBER_LEFT]: (args) =>
          this.i18n?.t(I18nKeys.NOTIFICATION_BOARD_MEMBER_LEFT, {
            lang: args.lang,
            args: {
              memberName: args.memberName,
              memberUrl: args.memberUrl,
              boardName: args.boardName,
              boardUrl: args.boardUrl,
            },
          }) ||
          `The user [${targetMemberUsername}](${targetMemberProfileUrl}) has left the board [${boardData?.name}](${boardData?.url}).`,

        [TrelloWebhookBoardActions.BOARD_MEMBER_JOINED]: (args) =>
          this.i18n?.t(I18nKeys.NOTIFICATION_BOARD_MEMBER_JOINED, {
            lang: args.lang,
            args: {
              memberName: args.memberName,
              memberUrl: args.memberUrl,
              boardName: args.boardName,
              boardUrl: args.boardUrl,
            },
          }) ||
          `A new member [${targetMemberUsername}](${targetMemberProfileUrl}) has joined the board [${boardData?.name}](${boardData?.url}).`,

        [TrelloWebhookBoardActions.BOARD_MEMBER_NORMAL_ROLE_ADDED]: (args) =>
          this.i18n?.t(I18nKeys.NOTIFICATION_BOARD_MEMBER_NORMAL_ROLE_ADDED, {
            lang: args.lang,
            args: {
              memberName: args.memberName,
              memberUrl: args.memberUrl,
              boardName: args.boardName,
              boardUrl: args.boardUrl,
            },
          }) ||
          `A new normal role has been added to a user [${targetMemberUsername}](${targetMemberProfileUrl}) on the board [${boardData?.name}](${boardData?.url}).`,
        [TrelloWebhookBoardActions.BOARD_MEMBER_NORMAL_ROLE_BECAME]: (args) =>
          this.i18n?.t(I18nKeys.NOTIFICATION_BOARD_MEMBER_NORMAL_ROLE_BECAME, {
            lang: args.lang,
            args: {
              memberName: args.memberName,
              memberUrl: args.memberUrl,
              boardName: args.boardName,
              boardUrl: args.boardUrl,
            },
          }) ||
          `User [${targetMemberUsername}](${targetMemberProfileUrl}) lowered his role on the board [${boardData?.name}](${boardData?.url}).`,

        [TrelloWebhookBoardActions.CUSTOM_FIELD_CREATED]: (args) =>
          this.i18n?.t(I18nKeys.NOTIFICATION_CUSTOM_FIELD_CREATED, {
            lang: args.lang,
            args: {
              customFieldName: args.customFieldName,
              boardName: args.boardName,
              boardUrl: args.boardUrl,
            },
          }) ||
          `The custom field ${customFieldName} has been created on the board [${boardData?.name}](${boardData?.url})`,

        [TrelloWebhookBoardActions.CUSTOM_FIELD_RENAMED]: (args) =>
          this.i18n?.t(I18nKeys.NOTIFICATION_CUSTOM_FIELD_RENAMED, {
            lang: args.lang,
            args: {
              oldCustomFieldName: args.oldCustomFieldName,
              customFieldName: args.customFieldName,
              boardName: args.boardName,
              boardUrl: args.boardUrl,
            },
          }) ||
          `The custom field has been renamed from ${oldCustomFieldName} to ${customFieldName} on the board [${boardData?.name}](${boardData?.url})`,

        [TrelloWebhookBoardActions.CUSTOM_FIELD_DELETED]: (args) =>
          this.i18n?.t(I18nKeys.NOTIFICATION_CUSTOM_FIELD_DELETED, {
            lang: args.lang,
            args: {
              customFieldName: args.customFieldName,
              memberName: args.memberName,
              memberUrl: args.memberUrl,
              boardName: args.boardName,
              boardUrl: args.boardUrl,
            },
          }) ||
          `The custom field ${customFieldName} has been deleted on the board [${boardData?.name}](${boardData?.url})`,

        [TrelloWebhookBoardActions.BOARD_PERM_LEVEL_CHANGED]: (args) =>
          this.i18n?.t(I18nKeys.NOTIFICATION_BOARD_PERM_LEVEL_CHANGED, {
            lang: args.lang,
            args: {
              permissionLevel: args.permissionLevel,
              boardName: args.boardName,
              boardUrl: args.boardUrl,
            },
          }) ||
          `Board [${boardData?.name}](${boardData?.url}) permission level has been changed to ${permissionLevel}`,
      };

      const userPromises = usersToNotify.map(async (userToNotify) => {
        if (!availablePlans.includes(userToNotify.subscription.plan)) {
          this.logger.warn(
            `User ${userToNotify.email} does not have subscription`,
          );
          return;
        }
        const userLanguage = userToNotify.language || Languages.EN;

        const userTimeZone = new Date(
          addMinutes(serverDate, (userToNotify.timezone || 0) * 60),
        );

        const formattedTimeZone = format(
          userTimeZone,
          this.configService.get(configServiceKeys.DATE_FORMAT),
        );

        const message = boardActionMessages[actionType]({
          lang: userLanguage,
          boardName: boardData?.name,
          boardUrl: boardData?.url,
          actionDate: formattedTimeZone,
          actionAuthor,
          actionAuthorUrl,
          memberName: targetMemberUsername,
          memberUrl: targetMemberProfileUrl,
          actionTarget: targetMemberUsername,
          actionTargetUrl: targetMemberProfileUrl,
          customFieldName,
        });

        if (!message) {
          this.logger.warn(`Unsupported card action: ${actionType}`);
          return;
        }

        if (userToNotify.telegram?.chatId) {
          const formattedTelegramMessage = notificationMessageGenerator(
            userToNotify,
            {
              boardName: boardData?.name,
              boardUrl: boardData?.url,
              actionDate: formattedTimeZone,
              translatedMessage: message,
              actionAuthor,
              actionAuthorUrl,
              actionTarget: targetMemberUsername,
              actionTargetUrl: targetMemberProfileUrl,
            },
            this.i18n,
          );

          await this.notificationBotService.sendMessageToUser(
            userToNotify.telegram,
            formattedTelegramMessage,
          );
        }

        if (userToNotify.discord?.userId) {
          const formattedTelegramMessage = notificationMessageGenerator(
            userToNotify,
            {
              boardName: boardData?.name,
              boardUrl: `<${boardData?.url}>`,
              actionDate: formattedTimeZone,
              translatedMessage: message,
              actionAuthor,
              actionAuthorUrl: `<${actionAuthorUrl}>`,
              actionTarget: targetMemberUsername,
              actionTargetUrl: `<${targetMemberProfileUrl}>`,
            },
            this.i18n,
          );

          await this.discordService.sendDirectMessage(
            userToNotify.discord?.userId,
            formattedTelegramMessage,
          );
        }
      });

      await Promise.all(userPromises);
    } catch (error) {
      this.logger.error('Error handling board action:', error);
    }
  }
}
