import {
  BadRequestException,
  ForbiddenException,
  forwardRef,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';

import {
  TrelloBoardsApiService,
  TrelloCardsApiService,
  TrelloWebhooksApiService,
} from '@trello/api';
import { TrelloActionsLogicService } from '@trello/logic';
import { I18nContext } from 'nestjs-i18n';
import { I18nKeys } from 'src/common/enums/i18n-keys.enum';
import { toCamelCase } from 'src/common/helpers/camelCase';
import { decryptText } from 'src/common/helpers/hashing';
import {
  getCategoriesForAction,
  getUpdatedWebhookNotifications,
  initializeNotificationArrays,
  mapNotificationsToBoolean,
  notificationProfiles,
  setAllKeysToFalse,
  sortCategories,
} from 'src/common/helpers/trello-notifications';

import { validateTrelloToken } from 'src/common/helpers/trello-tokens';
import { DefaultResponse } from 'src/common/interfaces/responses';
import { TelegramService } from 'src/telegram/telegram.service';
import { TrelloBoard } from 'src/trello/dto/board.dto';
import { BoardMember } from 'src/trello/dto/member.dto';
import { UpdateNotificationsDto } from 'src/trello/dto/notifications.dto';
import {
  TrelloWebhookDetailedActions,
  TrelloWebhookNotificationCategories,
  TrelloWebhookNotificationProfiles,
} from 'src/trello/enums/trello.actions.enum';
import { NotificationProfiles } from 'src/trello/interfaces/notification-profiles.interface';
import { User } from 'src/user/entities/user.entity';
import { UserRoles } from 'src/user/enums/role.enum';
import { UsersService } from 'src/user/services/users.service';
import { SharedConfigService } from '../../../config/shared.config.service';
import { CreateWebhookDto } from '../../dto/create-webhook.dto';
import { Webhook } from '../../entities/webhook.entity';
import { WebhookSearchPath } from '../../enums/query.enum';
import { TrelloWebhookRepository } from '../../repositories/webhook.repository';

/** key=APIKey is this.trelloApiKey of Trello power ups admin app key, which you can find here
 *  https://trello.com/power-ups/admin
 *  token=personal token of each user which he can get by authorizing here
 *  https://trello.com/1/authorize?expiration=never&scope=read&response_type=token&key={YourAPIKey}
 */

@Injectable()
export class TrelloWebhooksLogicService {
  private readonly webhookCallbackURL: string;
  private readonly encryptionKey: string;
  private readonly logger = new Logger(TrelloWebhooksLogicService.name);
  private webhookActionCount: Map<string, number> = new Map();

  constructor(
    @Inject(forwardRef(() => UsersService))
    private readonly userService: UsersService,
    private readonly sharedConfigService: SharedConfigService,
    @Inject(forwardRef(() => TrelloActionsLogicService))
    private readonly actionsService: TrelloActionsLogicService,
    @Inject(forwardRef(() => TrelloWebhooksApiService))
    private readonly trelloWebhookApiService: TrelloWebhooksApiService,
    private readonly trelloBoardsApiService: TrelloBoardsApiService,
    private readonly trelloCardsApiService: TrelloCardsApiService,
    private readonly trelloWebhookRepository: TrelloWebhookRepository,
    private readonly telegramService: TelegramService,
  ) {
    this.webhookCallbackURL = this.sharedConfigService.getWebhookCallbackURL();
    this.encryptionKey = this.sharedConfigService.getEncryptionKey();
  }

  async getWebhook(
    webhook: string | Webhook,
    i18n?: I18nContext,
  ): Promise<Webhook> {
    if (typeof webhook === 'string') {
      // If it's a string, fetch the webhook by ID
      return await this.findWebhookById(webhook, i18n);
    }
    return webhook; // If it's already a Webhook object, return it as-is
  }

  async replaceWebhookIfNeeded(
    webhook: Webhook | string,
    userToUpdate: User | string,
    webhookBoard: TrelloBoard | string,
  ): Promise<Webhook> {
    const existingWebhook = await this.getWebhook(webhook); // webhook to replace
    userToUpdate = await this.userService.getUser(userToUpdate);

    const decryptedUserToken = decryptText(
      userToUpdate.trello.token,
      this.encryptionKey,
    );

    if (typeof webhookBoard === 'string') {
      webhookBoard = await this.trelloBoardsApiService.fetchBoardById(
        decryptedUserToken,
        webhookBoard,
      );
    }

    const boardPersonalWebhookURL = `${this.webhookCallbackURL}/${webhookBoard.id}`;

    const decryptedAuthorToken = decryptText(
      existingWebhook.author.trelloToken,
      this.encryptionKey,
    );

    // Check if the webhook still exists in Trello
    const creatorWebhooks =
      await this.getWebhooksByCreatorToken(decryptedAuthorToken);

    const isWebhookStillActive = creatorWebhooks.some(
      (trelloWebhook) => trelloWebhook.id === existingWebhook.id,
    );

    if (!isWebhookStillActive) {
      // Find all users connected to the old webhook
      const usersConnectedToWebhook =
        await this.userService.findUsersConnectedToWebhook(existingWebhook.id);

      // Create a filtered copy of the existing webhook
      const existingWebhookCopy =
        await this.createFilteredWebhookCopy(existingWebhook);

      // Delete old webhook
      await this.trelloWebhookRepository.deleteById(existingWebhookCopy.id);

      // Create a new webhook using the Trello API
      const newWebhook = await this.trelloWebhookApiService.createWebhook(
        decryptedUserToken,
        boardPersonalWebhookURL,
        webhookBoard.id,
      );

      console.log('new webhook id: ', newWebhook.id);

      const createdWebhook = {
        ...newWebhook,
        boardName: webhookBoard.name,
        boardUrl: webhookBoard.url,
        author: {
          trelloToken: userToUpdate.trello.token,
          trelloUserId: userToUpdate.trello.userId,
        },
        subscribers: existingWebhookCopy.subscribers, // Keep old subscribers
        notifications: existingWebhookCopy.notifications, // Keep old notifications
      };

      delete createdWebhook.updatedAt;
      delete createdWebhook.createdAt;

      // Save the new webhook to the database
      const savedNewWebhook =
        await this.trelloWebhookRepository.create(createdWebhook);
      console.log('created webhookId: ', savedNewWebhook.id);

      // Update all users connected to the old webhook
      const updateUserPromises = usersConnectedToWebhook.map(
        (connectedUser) => {
          const updatedWebhooks = connectedUser.trello.webhooks.map(
            (userWebhook) => {
              if (userWebhook.webhookId === existingWebhook.id) {
                return {
                  ...userWebhook,
                  webhookId: savedNewWebhook.id,
                  idModel: savedNewWebhook.idModel,
                  modelName: savedNewWebhook.boardName,
                };
              }
              return userWebhook;
            },
          );

          const updatedUserProps = {
            trello: {
              ...connectedUser.trello,
              webhooks: updatedWebhooks,
            },
          };

          return this.userService.updateUser(connectedUser, updatedUserProps);
        },
      );

      await Promise.all(updateUserPromises);

      this.logger.log(
        `Old webhook for board ${existingWebhook.boardName} replaced with new webhook`,
      );

      return savedNewWebhook;
    }

    // If the webhook is still active, return the existing webhook
    return existingWebhook;
  }

  async getProfileNotifications(): Promise<NotificationProfiles> {
    return notificationProfiles;
  }

  async getWebhooksByCreatorToken(creatorToken: string): Promise<any> {
    const tokenRelatedWebhooks =
      await this.trelloWebhookApiService.getWebhooksByToken(creatorToken);

    return tokenRelatedWebhooks;
  }

  async createFilteredWebhookCopy(webhook: string | Webhook): Promise<any> {
    const webhookToCopy = await this.getWebhook(webhook);

    const filteredWebhookProperties = await this.filterUserFromWebhook(
      webhook,
      webhookToCopy.author.trelloUserId,
    );

    const webhookCopy = {
      ...webhookToCopy,
      subscribers: filteredWebhookProperties.updatedWebhookSubscribers,
      notifications: filteredWebhookProperties.updatedWebhookNotifications,
    };

    return webhookCopy;
  }

  async filterUserFromWebhook(webhook: string | Webhook, trelloUserId: string) {
    const webhookToDisconnect = await this.getWebhook(webhook);

    const updatedWebhookSubscribers = webhookToDisconnect.subscribers
      ? webhookToDisconnect.subscribers.filter(
          (subscriber) => subscriber.trelloUserId !== trelloUserId,
        )
      : [];
    const userNotificationsDisconnectArray = setAllKeysToFalse(
      webhookToDisconnect.notifications,
    );

    const updatedWebhookNotifications = getUpdatedWebhookNotifications(
      trelloUserId,
      webhookToDisconnect.notifications,
      userNotificationsDisconnectArray,
    );

    return { updatedWebhookSubscribers, updatedWebhookNotifications };
  }

  async createTrelloWebhook(
    user: string | User,
    createWebhookDto: CreateWebhookDto,
    i18n?: I18nContext,
  ): Promise<DefaultResponse<Webhook>> {
    const { boardId } = createWebhookDto;
    const boardPersonalWebhookURL = `${this.webhookCallbackURL}/${boardId}`;
    let webhook = await this.trelloWebhookRepository.findOneByBoardId(boardId);
    console.log('old webhookId', webhook.id);
    const userToUpdate = await this.userService.getUser(user, i18n);

    validateTrelloToken(userToUpdate.trello.token, i18n);
    const decryptedUserToken = decryptText(
      userToUpdate.trello.token,
      this.encryptionKey,
    );

    const connectedBoard = await this.trelloBoardsApiService.fetchBoardById(
      decryptedUserToken,
      boardId,
    );

    if (webhook) {
      webhook = await this.replaceWebhookIfNeeded(
        webhook,
        userToUpdate,
        connectedBoard,
      );

      // Webhook is still active; add the user as a subscriber if not already subscribed
      const webhookSubscribers = webhook.subscribers.map(
        (subscriber) => subscriber.trelloUserId,
      );

      if (!webhookSubscribers.includes(userToUpdate.trello.userId)) {
        webhook.subscribers.push({
          trelloUserId: userToUpdate.trello.userId,
          trelloToken: userToUpdate.trello.token,
          notificationProfile: TrelloWebhookNotificationProfiles.BASIC,
        });
      }

      const defaultUserNotifications = initializeNotificationArrays(
        userToUpdate.trello.userId,
      );

      const newUserNotificationBooleans = mapNotificationsToBoolean(
        defaultUserNotifications,
      );

      const updatedNotifications = getUpdatedWebhookNotifications(
        userToUpdate.trello.userId,
        webhook.notifications,
        newUserNotificationBooleans,
      );

      const userWebhook = {
        idModel: webhook.idModel,
        modelName: webhook.boardName,
        webhookId: webhook.id,
      };

      if (
        !userToUpdate.trello.webhooks.find(
          (userWebhook) => userWebhook.webhookId === webhook.id,
        )
      ) {
        userToUpdate.trello.webhooks.push(userWebhook);
      }

      const updatedUserProps = {
        trello: {
          ...userToUpdate.trello,
          webhooks: userToUpdate.trello.webhooks,
        },
      };

      await Promise.all([
        this.userService.updateUser(userToUpdate, updatedUserProps),
        this.trelloWebhookRepository.updateById(webhook.id, {
          subscribers: webhook.subscribers,
          notifications: updatedNotifications,
        }),
        this.telegramService.sendMessageToUser(
          userToUpdate.telegram,
          `Notifications for board [${webhook.boardName}](${webhook.boardUrl}) connected successfully`,
        ),
      ]);

      this.logger.log(
        `Webhook for board ${webhook.boardName} exists, user ${userToUpdate.id} added as a subscriber`,
      );

      return {
        message: `Webhook for board ${webhook.boardName} exists, user ${userToUpdate.id} added as a subscriber`,
        statusCode: HttpStatus.OK,
        data: webhook,
      };
    }

    // Create a new webhook if no existing webhook is found
    const response = await this.trelloWebhookApiService.createWebhook(
      decryptedUserToken,
      boardPersonalWebhookURL,
      boardId,
    );
    console.log('Webhook created: ', response);

    try {
      const createdWebhook = {
        ...response,
        boardName: connectedBoard.name,
        boardUrl: connectedBoard.url,
        author: {
          trelloToken: userToUpdate.trello.token,
          trelloUserId: userToUpdate.trello.userId,
        },
        subscribers: [
          {
            trelloUserId: userToUpdate.trello.userId,
            notificationProfile: TrelloWebhookNotificationProfiles.BASIC,
          },
        ],
        notifications: initializeNotificationArrays(userToUpdate.trello.userId),
      };

      const userWebhook = {
        idModel: createdWebhook.idModel,
        modelName: createdWebhook.boardName,
        webhookId: createdWebhook.id,
      };

      const updatedUserProps = {
        trello: {
          ...userToUpdate.trello,
          webhooks: userToUpdate.trello.webhooks
            ? [...userToUpdate.trello.webhooks, userWebhook]
            : [userWebhook],
        },
      };

      await Promise.all([
        this.userService.updateUser(user, updatedUserProps),
        this.trelloWebhookRepository.create(createdWebhook),
        this.telegramService.sendMessageToUser(
          userToUpdate.telegram,
          `Notifications for board [${createdWebhook.boardName}](${createdWebhook.boardUrl}) connected successfully`,
        ),
      ]);

      this.logger.log(
        `Webhook for board ${createdWebhook.boardName} created successfully`,
      );

      return {
        message: 'Webhook created successfully',
        statusCode: HttpStatus.OK,
        data: createdWebhook,
      };
    } catch (err) {
      console.log(err);
      this.logger.error(
        'Error creating webhook:',
        err.response ? err.response.data : err.response.message,
      );
      throw new BadRequestException(
        err.response ? err.response.data : err.response.message,
      );
    }
  }

  async updateTrelloWebhookNotifications(
    user: string | User,
    webhook: string | Webhook,
    updateWebhookNotificationsDto: UpdateNotificationsDto,
    i18n: I18nContext,
  ): Promise<DefaultResponse<Webhook>> {
    const userToUpdate = await this.userService.getUser(user);
    const webhookToUpdate = await this.getWebhook(webhook);
    const subscriberIds = webhookToUpdate.subscribers.map(
      (subscriber) => subscriber.trelloUserId,
    );
    const { notifications, notificationProfile } =
      updateWebhookNotificationsDto;

    if (!subscriberIds.includes(userToUpdate.trello.userId)) {
      throw new ForbiddenException(
        i18n?.t(I18nKeys.ERRORS_TRELLO_YOU_ARE_NOT_CONNECTED_TO_WEBHOOK) ||
          `You are not connected to this webhook`,
      );
    }

    validateTrelloToken(userToUpdate.trello.token, i18n);

    await this.replaceWebhookIfNeeded(
      webhook,
      userToUpdate,
      webhookToUpdate.idModel,
    );

    try {
      const updatedNotifications = getUpdatedWebhookNotifications(
        userToUpdate.trello.userId,
        webhookToUpdate.notifications,
        notifications,
      );

      const subscriberToUpdate = webhookToUpdate.subscribers.find(
        (subscriber) => subscriber.trelloUserId === userToUpdate.trello.userId,
      );

      subscriberToUpdate.notificationProfile = notificationProfile;

      const updatedWebhook = await this.trelloWebhookRepository.updateById(
        webhookToUpdate.id,
        {
          notifications: updatedNotifications,
          subscribers: webhookToUpdate.subscribers,
        },
      );

      this.logger.log(`Webhook ${webhookToUpdate.id} updated successfully`);

      return {
        message: `Webhook ${webhookToUpdate.id} updated successfully`,
        statusCode: HttpStatus.OK,
        data: updatedWebhook,
      };
    } catch (err) {
      this.logger.error(
        'Error updating webhook:',
        err.response ? err.response.data : err.message,
      );
      throw new BadRequestException(
        err.response ? err.response.data : err.message,
      );
    }
  }

  async handleTrelloWebhook(webhookAction: any): Promise<any> {
    // console.log(JSON.stringify(webhookAction, null, 2));
    const filteredLog = {
      webhookId: webhookAction.model?.id,
      memberCreator: webhookAction.action.memberCreator?.username,
      actionType: webhookAction.action.type,
      translationKey: webhookAction.action.display?.translationKey,
      modelName: webhookAction.model?.name,
      modelUrl: webhookAction.model?.url,
      actionDate: webhookAction.action.date,
    };

    console.log(JSON.stringify(filteredLog, null, 2));

    const currentCount =
      this.webhookActionCount.get(webhookAction?.webhook?.id) || 0;
    this.webhookActionCount.set(webhookAction?.webhook?.id, currentCount + 1);

    this.logger.log(
      `Webhook id: ${webhookAction.model?.id}, actions count: ${this.webhookActionCount.get(webhookAction?.webhook?.id)}`,
    );

    const webhook = await this.getWebhook(webhookAction?.webhook?.id);

    if (!webhook) {
      this.logger.warn('Missing action or webhook data.');
      return;
    }

    const targetCard = webhookAction?.action?.data?.card;
    const targetBoard = webhookAction?.action?.data?.board;

    const authorizedToken = decryptText(
      webhook.author.trelloToken,
      this.encryptionKey,
    );

    const generalActionType = webhookAction?.action?.type;
    let detailedActionType = webhookAction?.action?.display?.translationKey;
    const targetMember = webhookAction?.action?.member;

    // to handle unknown detailed type actions which has clear generalActionType etc createCheckItem
    if (detailedActionType === 'unknown') {
      this.logger.warn(
        `unknown action type, general type: ${generalActionType}`,
      );
      detailedActionType = generalActionType;
    }

    this.logger.log(`Handling webhook ${detailedActionType} action...`);

    let enumKey = null;

    // Check if enum value includes action we got from webhook and transform enum key (CARD_CREATED -> cardCreated)
    if (
      Object.values(TrelloWebhookDetailedActions).includes(detailedActionType)
    ) {
      enumKey = toCamelCase(
        Object.keys(TrelloWebhookDetailedActions).find(
          (key) => TrelloWebhookDetailedActions[key] === detailedActionType,
        ),
        '_',
      );
    }

    // Get the category dynamically
    const matchingCategories = getCategoriesForAction(enumKey);

    if (matchingCategories.length === 0) {
      this.logger.warn(
        `Action ${detailedActionType} is not supported by this API.`,
      );
      return;
    }

    //we ensure that personal category actions will be processed first
    const sortedCategories = sortCategories(matchingCategories);

    let boardData = null;
    let cardData = null;

    if (targetBoard) {
      boardData = await this.trelloBoardsApiService.fetchBoardById(
        authorizedToken,
        targetBoard.id,
      );
    }

    if (targetCard) {
      cardData = await this.trelloCardsApiService.fetchCardById(
        authorizedToken,
        targetCard.id,
      );
    }

    let notifiedTargetUser: string | null;
    let boardMemberships: BoardMember[] | null;

    for (const category of sortedCategories) {
      const actionSubscribers =
        webhook.notifications[category]?.[enumKey] || [];

      if (actionSubscribers.length === 0) {
        this.logger.warn(
          `Nobody tracks ${enumKey} action in category ${category}.`,
        );
        continue;
      }

      switch (category) {
        case TrelloWebhookNotificationCategories.CARD:
          if (cardData) {
            const cardMembers = cardData.idMembers || [];
            const membersToNotify = cardMembers.filter(
              (memberId) =>
                actionSubscribers.includes(memberId) &&
                memberId !== notifiedTargetUser,
            );

            const userPromises = membersToNotify.map((member) =>
              this.actionsService.handleCardActions(
                member,
                cardData,
                detailedActionType,
                webhookAction,
              ),
            );

            await Promise.all(userPromises);
          }
          break;

        case TrelloWebhookNotificationCategories.PERSONAL:
          //separate handler because this two actions does not have
          // webhookAction?.action?.member even though it is targeted action
          if (
            detailedActionType ===
              TrelloWebhookDetailedActions.CHECKLIST_ITEM_MEMBER_ADDED ||
            detailedActionType ===
              TrelloWebhookDetailedActions.CHECKLIST_ITEM_MEMBER_REMOVED
          ) {
            const targetedUserId =
              webhookAction.action.data.checkItem.idMember ||
              webhookAction.action.data.old.idMember;
            if (actionSubscribers.includes(targetedUserId))
              await this.actionsService.handlePersonalAction(
                targetedUserId,
                boardData,
                detailedActionType,
                webhook,
                targetCard
                  ? await this.trelloCardsApiService.fetchCardById(
                      authorizedToken,
                      targetCard.id,
                    )
                  : null,
              );
            notifiedTargetUser = targetedUserId;
          }

          if (targetMember && actionSubscribers.includes(targetMember.id)) {
            await this.actionsService.handlePersonalAction(
              targetMember.id,
              boardData,
              detailedActionType,
              webhook,
              targetCard
                ? await this.trelloCardsApiService.fetchCardById(
                    authorizedToken,
                    targetCard.id,
                  )
                : null,
            );
            notifiedTargetUser = targetMember.id;
          }
          break;

        case TrelloWebhookNotificationCategories.ADMIN:
          if (boardData) {
            boardMemberships =
              boardMemberships ??
              (await this.trelloBoardsApiService.fetchBoardMemberships(
                authorizedToken,
                boardData.id,
              ));

            const membersToNotify = boardMemberships.filter(
              (member) =>
                actionSubscribers.includes(member.idMember) &&
                member.memberType === 'admin' &&
                member.idMember !== notifiedTargetUser,
            );

            const userPromises = membersToNotify.map(async (member) => {
              await this.actionsService.handleAdminActions(
                member.idMember,
                boardData,
                detailedActionType,
                targetMember,
              );
            });

            await Promise.all(userPromises);
          }
          break;

        case TrelloWebhookNotificationCategories.BOARD:
          if (boardData) {
            boardMemberships =
              boardMemberships ??
              (await this.trelloBoardsApiService.fetchBoardMemberships(
                authorizedToken,
                boardData.id,
              ));

            const membersToNotify = boardMemberships.filter(
              (member) =>
                actionSubscribers.includes(member.idMember) &&
                member.idMember !== notifiedTargetUser,
            );

            const userPromises = membersToNotify.map(async (member) => {
              await this.actionsService.handleBoardActions(
                member.idMember,
                boardData,
                detailedActionType,
              );
            });

            await Promise.all(userPromises);
          }
          break;

        default:
          this.logger.warn(`Unsupported category: ${category}`);
      }
    }
  }

  async disconnectFromTrelloWebhook(
    user: string | User,
    webhook: string | Webhook,
    i18n?: I18nContext,
  ): Promise<DefaultResponse<Webhook>> {
    const userToUpdate = await this.userService.getUser(user);
    const webhookToUpdate = await this.getWebhook(webhook);

    validateTrelloToken(userToUpdate.trello.token, i18n);

    if (
      !userToUpdate.trello.webhooks.find(
        (userWebhook) => userWebhook.webhookId === webhookToUpdate.id,
      )
    ) {
      throw new BadRequestException(
        i18n?.t(I18nKeys.ERRORS_TRELLO_USER_IS_NOT_CONNECTED_TO_WEBHOOK),
        `User is not connected to webhook ${webhookToUpdate.id}`,
      );
    }

    const updatedUserWebhooks = userToUpdate.trello.webhooks
      ? userToUpdate.trello.webhooks.filter(
          (userWebhook) => userWebhook.webhookId !== webhookToUpdate.id,
        )
      : [];

    const updatedUser = {
      trello: {
        webhooks: updatedUserWebhooks,
      },
    };

    const filteredWebhookData = await this.filterUserFromWebhook(
      webhookToUpdate,
      userToUpdate.trello.userId,
    );

    const {
      updatedWebhookSubscribers: filteredSubcribers,
      updatedWebhookNotifications: filteredNotifications,
    } = filteredWebhookData;

    const updatedWebhook = await this.trelloWebhookRepository.updateById(
      webhookToUpdate.id,
      {
        subscribers: filteredSubcribers,
        notifications: filteredNotifications,
      },
    );

    await Promise.all([
      this.userService.updateUser(userToUpdate, updatedUser),

      this.telegramService.sendMessageToUser(
        userToUpdate.telegram,
        `Notifications for board [${webhookToUpdate.boardName}](${webhookToUpdate.boardUrl}) disconnected successfully`,
      ),
    ]);

    return {
      message: `Webhook ${webhookToUpdate.id} disconnected successfully`,
      statusCode: HttpStatus.OK,
      data: updatedWebhook,
    };
  }

  async disconnectFromAllTrelloWebhooks(
    user: string | User,
    i18n?: I18nContext,
  ): Promise<DefaultResponse<string>> {
    const userToDisconnect = await this.userService.getUser(user, i18n);
    validateTrelloToken(userToDisconnect.trello.token, i18n);
    try {
      if (
        !userToDisconnect?.trello?.webhooks ||
        userToDisconnect.trello.webhooks.length === 0
      ) {
        return {
          message: `User ${userToDisconnect.id} disconnected from all Trello webhooks successfully`,
          statusCode: HttpStatus.OK,
        };
      }

      const webhooksToClear = userToDisconnect.trello.webhooks;

      console.log(webhooksToClear);

      //we create array of mongo operations to call them later in one request
      const bulkUpdateOperations = await Promise.all(
        webhooksToClear.map(async (webhook) => {
          const updateObject: any = {
            $pull: {
              [WebhookSearchPath.Subscribers]: {
                trelloUserId: userToDisconnect.trello.userId, // Match objects with the specific `trelloUserId`
              },
            },
          };

          const webhookToDisconnect =
            await this.trelloWebhookRepository.findOneById(webhook.webhookId);

          console.log(webhookToDisconnect);
          //remove userId from all notifications in each webhook.notifications object
          if (webhookToDisconnect && webhookToDisconnect.notifications) {
            // Iterate over each category (e.g., board, card, admin)
            Object.keys(webhookToDisconnect.notifications).forEach(
              (category) => {
                const actions = webhookToDisconnect.notifications[category];

                // Iterate over each action within the category
                Object.keys(actions).forEach((notificationType) => {
                  const notificationPath = `${WebhookSearchPath.Notifications}.${category}.${notificationType}`;
                  updateObject.$pull[notificationPath] =
                    userToDisconnect.trello.userId;
                });
              },
            );
          }

          return {
            updateOne: {
              filter: { id: webhookToDisconnect.id },
              update: updateObject,
            },
          };
        }),
      );

      if (bulkUpdateOperations.length > 0) {
        await this.trelloWebhookRepository.bulkUpdateWebhooks(
          bulkUpdateOperations,
        );
      }

      const updatedUserProps = {
        trello: {
          webhooks: [],
        },
      };

      await this.userService.updateUser(userToDisconnect, updatedUserProps);

      return {
        message: `User ${userToDisconnect.id} disconnected from all Trello webhooks successfully`,
        statusCode: HttpStatus.OK,
      };
    } catch (err) {
      // console.log(err);
      this.logger.error('Error during bulk update of webhooks:', err);
      throw new BadRequestException(
        i18n?.t(I18nKeys.ERRORS_TRELLO_WEBHOOKS_DISCONNECT) ||
          'Error disconnecting from all Trello webhooks',
      );
    }
  }

  async removeTrelloWebhook(
    webhook: string | Webhook,
    i18n?: I18nContext,
  ): Promise<DefaultResponse<null>> {
    const webhookToDelete = await this.getWebhook(webhook, i18n);

    const { id: webhookId, author } = webhookToDelete;

    const webhookAuthorToken = decryptText(
      author.trelloToken,
      this.encryptionKey,
    );

    try {
      await this.trelloWebhookApiService.deleteWebhook(
        webhookAuthorToken,
        webhookId,
      );
    } catch (deleteError) {
      this.logger.warn(
        `Webhook ${webhookId} could not be deleted from Trello: ${deleteError.message || deleteError.response.message}`,
      );
    }

    try {
      await this.userService.removeWebhookFromAllUsers(webhookToDelete);

      await this.trelloWebhookRepository.deleteById(webhookId);

      this.logger.log(
        `Webhook for model ${webhookToDelete.boardName} deleted successfully`,
      );
      return {
        message: `Webhook ${webhookId} deleted successfully from Trello and all connected users`,
        statusCode: HttpStatus.OK,
      };
    } catch (err) {
      // console.log(err);
      this.logger.error(
        'Error deleting webhook:',
        err.response ? err.response.message : err.message,
      );
      throw new BadRequestException(
        err.response ? err.response.message : err.message,
      );
    }
  }

  async removeAllWebhooks(
    user: string | User,
    i18n?: I18nContext,
  ): Promise<DefaultResponse<null>> {
    const superadmin = await this.userService.getUser(user, i18n);

    if (superadmin.role !== UserRoles.superadmin) {
      throw new ForbiddenException(
        i18n?.t(I18nKeys.ERRORS_GENERAL_FORBIDDEN_RESOURCE) ||
          `Forbidden resource`,
      );
    }

    const webhooks = await this.findAllWebhooks();

    if (!webhooks.length) {
      this.logger.log('No webhooks found to delete.');
      return {
        message: 'No webhooks to delete.',
        statusCode: HttpStatus.OK,
      };
    }

    try {
      await Promise.all(
        webhooks.map((webhook) => this.removeTrelloWebhook(webhook)),
      );

      this.logger.log('All webhooks deleted successfully.');
      return {
        message:
          'All webhooks deleted successfully from Trello and all connected users.',
        statusCode: HttpStatus.OK,
      };
    } catch (err) {
      // console.log(err);
      this.logger.error(
        'Error deleting all webhooks:',
        err.response ? err.response.message : err.message,
      );
      throw new BadRequestException(
        err.response ? err.response.message : err.message,
      );
    }
  }

  async findMemberWebhooks(
    user: string | User,
    i18n: I18nContext,
  ): Promise<Webhook[]> {
    const requestedUser = await this.userService.getUser(user);
    validateTrelloToken(requestedUser.trello.token, i18n);
    const webhooks =
      await this.trelloWebhookRepository.findWebhooksConnectedToUser(
        requestedUser.trello.userId,
      );

    return webhooks;

    // in case if you need find all webhooks from trello which is user created
    // const decryptedUserToken = decryptText(userToFind.trello.token, this.encryptionKey);
    // const url = `${trelloApiLink}/tokens/${decryptedUserToken}/webhooks?key=${this.trelloApiKey}`;

    // try {
    //   const response = await axios.get(url);

    //   return response.data;
    // } catch (err) {
    //   console.error('Error finding members webhooks:', err.response ? err.response.data : err.message);
    //   throw new BadRequestException(err.response ? err.response.data : err.message);
    // }
  }

  async findWebhookById(
    webhookId: string,
    i18n?: I18nContext,
  ): Promise<Webhook> {
    const webhook = await this.trelloWebhookRepository.findOneById(webhookId);

    if (!webhook) {
      throw new NotFoundException(
        i18n?.t(I18nKeys.ERRORS_TRELLO_WEBHOOK_NOT_FOUND_BY_ID, {
          args: { webhookId },
        }) || `Webhook with id ${webhookId} not found`,
      );
    }

    return webhook;
  }

  async findWebhookByBoardId(
    boardId: string,
    i18n?: I18nContext,
  ): Promise<Webhook> {
    const webhook =
      await this.trelloWebhookRepository.findOneByBoardId(boardId);

    if (!webhook) {
      throw new NotFoundException(
        i18n?.t(I18nKeys.ERRORS_TRELLO_WEBHOOK_NOT_FOUND_BY_BOARD_ID, {
          args: { boardId },
        }) || `Webhook with boardId ${boardId} not found`,
      );
    }

    return webhook;
  }

  async findAllWebhooks(): Promise<Webhook[]> {
    return await this.trelloWebhookRepository.findAll();
  }
}
