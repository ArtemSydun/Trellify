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

import { ConfigService } from '@nestjs/config';
import {
  TrelloBatchApiService,
  TrelloBoardsApiService,
  TrelloCardsApiService,
  TrelloWebhooksApiService,
} from '@trello/api';
import {
  TrelloActionsLogicService,
  TrelloTokensLogicService,
} from '@trello/logic';
import { I18nContext, I18nService } from 'nestjs-i18n';

import { configServiceKeys } from 'src/common/enums/config-service-keys.enum';
import { I18nKeys } from 'src/common/enums/i18n-keys.enum';
import { Languages } from 'src/common/enums/languages.enum';
import { decryptText } from 'src/common/helpers/hashing';
import {
  createFilteredWebhookCopy,
  filterUserFromWebhook,
  getActionEnumKey,
  getCategoriesForAction,
  getUpdatedWebhookNotifications,
  initializeNotificationArrays,
  mapNotificationsToBoolean,
} from 'src/common/helpers/trello-notifications';

import { validateTrelloToken } from 'src/common/helpers/trello-tokens';
import {
  DefaultPaginatedResponse,
  DefaultResponse,
} from 'src/common/interfaces/responses';
import { RedisService } from 'src/redis/services/redis.service';
import { Subscription } from 'src/subscription/entities/subscription.entity';
import { SubscriptionPlans } from 'src/subscription/enum/subscription-plan.enum';
import { SubscriptionService } from 'src/subscription/services/subscription.service';
import { NotificationBotService } from 'src/telegram/notification-bot/notification-bot.service';
import { TrelloBoard } from 'src/trello/dto/board.dto';
import { BoardMember } from 'src/trello/dto/member.dto';
import {
  UpdateManyNotificationsDto,
  UpdateNotificationsDto,
} from 'src/trello/dto/notifications.dto';
import { WebhookQueryDto } from 'src/trello/dto/webhook.query.dto';
import {
  TrelloWebhookDetailedActions,
  TrelloWebhookNotificationCategories,
  TrelloWebhookNotificationProfiles,
} from 'src/trello/enums/trello.actions.enum';
import { NotificationProfiles } from 'src/trello/interfaces/notification-profiles.interface';
import { User } from 'src/user/entities/user.entity';
import { UserSearchPath } from 'src/user/enums/query.enum';
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
  private webhookActionCount: number;

  constructor(
    @Inject(forwardRef(() => UsersService))
    private readonly userService: UsersService,
    private readonly sharedConfigService: SharedConfigService,
    private readonly configService: ConfigService,
    @Inject(forwardRef(() => TrelloActionsLogicService))
    private readonly actionsService: TrelloActionsLogicService,
    @Inject(forwardRef(() => TrelloWebhooksApiService))
    private readonly trelloWebhookApiService: TrelloWebhooksApiService,
    private readonly trelloBoardsApiService: TrelloBoardsApiService,
    private readonly trelloCardsApiService: TrelloCardsApiService,
    private readonly trelloBatchApiService: TrelloBatchApiService,
    private readonly trelloWebhookRepository: TrelloWebhookRepository,
    private readonly trelloTokensLogicService: TrelloTokensLogicService,
    private readonly notificationBotService: NotificationBotService,
    @Inject(forwardRef(() => SubscriptionService))
    private readonly subscriptionService: SubscriptionService,
    private readonly redisService: RedisService,
    private readonly i18nService: I18nService,
  ) {
    this.webhookCallbackURL = this.sharedConfigService.getWebhookCallbackURL();
    this.encryptionKey = this.sharedConfigService.getEncryptionKey();
    this.webhookActionCount = 0;
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

    const decryptedAuthorToken = decryptText(
      webhook.author.trelloToken,
      this.encryptionKey,
    );

    let boardData;

    try {
      boardData = await this.trelloBoardsApiService.fetchBoardById(
        decryptedAuthorToken,
        webhook.idModel,
      );
    } catch (error) {
      this.logger.error(
        `Error find board ${webhook.boardName}: `,
        error.message || error.response.message,
      );
    }

    const updatedWebhookProps: any = {};
    let shouldUpdateUsers = false;

    if (boardData) {
      if (boardData.idOrganization !== webhook.idWorkspace) {
        updatedWebhookProps.idWorkspace = boardData.idOrganization;
      }

      if (
        boardData.name !== webhook.boardName ||
        boardData.url !== webhook.boardUrl
      ) {
        updatedWebhookProps.boardName = boardData.name;
        updatedWebhookProps.boardUrl = boardData.url;
        shouldUpdateUsers = true;
      }
    }

    // If there are updates, update the webhook
    if (Object.keys(updatedWebhookProps).length > 0) {
      const updatedWebhook = await this.trelloWebhookRepository.updateById(
        webhook.id,
        updatedWebhookProps,
      );

      // Only update users if board name or URL changed
      if (shouldUpdateUsers) {
        const usersToUpdate =
          await this.userService.findUsersConnectedToWebhook(updatedWebhook.id);

        const updateUserPromises = usersToUpdate.map((subscriber) => {
          const updatedWebhooks = subscriber.trello.webhooks.map(
            (userWebhook) => {
              if (userWebhook.webhookId === webhook.id) {
                return {
                  ...userWebhook,
                  idModel: updatedWebhook.idModel,
                  modelName: updatedWebhook.boardName,
                };
              }
              return userWebhook;
            },
          );

          return {
            updateOne: {
              filter: { id: subscriber.id },
              update: {
                $set: {
                  [UserSearchPath.TrelloWebhooks]: updatedWebhooks,
                },
              },
            },
          };
        });

        await this.userService.updateManyUsers(updateUserPromises);
      }

      return updatedWebhook;
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

  async findWebhooks(
    queryParams: WebhookQueryDto,
  ): Promise<DefaultPaginatedResponse<Webhook>> {
    return await this.trelloWebhookRepository.getAll(queryParams);
  }

  async findAllWebhooks(): Promise<Webhook[]> {
    return await this.trelloWebhookRepository.findAll();
  }

  async findMyConnectedWebhooks(
    user: string | User,
    i18n?: I18nContext,
  ): Promise<Webhook[]> {
    const requestedUser = await this.userService.getUser(user, i18n);

    validateTrelloToken(requestedUser.trello.token, i18n);

    const webhooks =
      await this.trelloWebhookRepository.findWebhooksConnectedToUser(
        requestedUser.trello.userId,
      );

    return webhooks;
  }

  async findMyCreatedWebhooks(
    user: string | User,
    i18n?: I18nContext,
  ): Promise<Webhook[]> {
    const requestedUser = await this.userService.getUser(user, i18n);
    validateTrelloToken(requestedUser.trello.token, i18n);
    const webhooks =
      await this.trelloWebhookRepository.findWebhooksCreatedByUser(
        requestedUser.trello.userId,
      );

    return webhooks;
  }

  async findUserSubscribedWebhooks(
    user: string | User,
    i18n?: I18nContext,
  ): Promise<Webhook[]> {
    const userToFind = await this.userService.getUser(user, i18n);

    return await this.trelloWebhookRepository.findWebhooksConnectedToUser(
      userToFind.trello.userId,
    );
  }

  async findUserCreatedWebhooks(
    user: string | User,
    i18n?: I18nContext,
  ): Promise<Webhook[]> {
    const requestedUser = await this.userService.getUser(user, i18n);

    const webhooks =
      await this.trelloWebhookRepository.findWebhooksCreatedByUser(
        requestedUser.trello.userId,
      );

    return webhooks;
  }

  async findWebhookSubscribers(
    webhookId: string,
    i18n?: I18nContext,
  ): Promise<User[]> {
    const webhook = await this.getWebhook(webhookId, i18n);

    const subscribers = await this.userService.findUsersConnectedToWebhook(
      webhook.id,
    );

    return subscribers;
  }

  async recreateWebhookIfUnavailable(
    webhook: Webhook | string,
    userToUpdate: User | string,
    i18n?: I18nContext,
    webhookBoard?: TrelloBoard | string,
  ): Promise<Webhook> {
    const existingWebhook = await this.getWebhook(webhook, i18n);
    userToUpdate = await this.userService.getUser(userToUpdate, i18n);

    let authorWebhooks;
    const decryptedUserToken = decryptText(
      userToUpdate.trello.token,
      this.encryptionKey,
    );

    const decryptedAuthorToken = decryptText(
      existingWebhook.author.trelloToken,
      this.encryptionKey,
    );

    const boardPersonalWebhookURL = `${this.webhookCallbackURL}/${existingWebhook.idModel}`;

    authorWebhooks = [];

    try {
      await this.trelloTokensLogicService.isTokenInfinite(
        decryptedAuthorToken,
        i18n,
      );

      authorWebhooks = await this.trelloWebhookApiService.getWebhooksByToken(
        decryptedAuthorToken,
        i18n,
      );
    } catch (error) {
      if (error.message === i18n?.t(I18nKeys.ERRORS_TRELLO_INVALID_APP_KEY)) {
        this.logger.warn(
          `User ${existingWebhook.author.trelloUserId} has invalid trello token`,
        );
        // await this.removeAllWebhooksCreatedByUser(webhooksAuthor, i18n);
        // throw new BadRequestException(`Please refresh page`);
      }
    }

    if (!webhookBoard) {
      const boardId = existingWebhook.idModel;
      webhookBoard = await this.trelloBoardsApiService.fetchBoardById(
        decryptedUserToken,
        boardId,
        i18n,
      );
    }

    if (typeof webhookBoard === 'string') {
      webhookBoard = await this.trelloBoardsApiService.fetchBoardById(
        decryptedUserToken,
        webhookBoard,
        i18n,
      );
    }

    // Check if the webhook still exists in Trello
    if (!authorWebhooks.some((webhook) => webhook.id === existingWebhook.id)) {
      // Find all users connected to the old webhook
      const usersConnectedToWebhook =
        await this.userService.findUsersConnectedToWebhook(existingWebhook.id);

      const usersWithoutOldAuthor = usersConnectedToWebhook.filter(
        (user) => user.trello.userId !== existingWebhook.author.trelloUserId,
      );

      // Create a filtered copy of the existing webhook
      const existingWebhookCopy = createFilteredWebhookCopy(existingWebhook);

      // Delete old webhook
      await this.trelloWebhookRepository.deleteById(existingWebhookCopy.id);

      // Create a new webhook using the Trello API
      const newWebhook = await this.trelloWebhookApiService.createWebhook(
        decryptedUserToken,
        boardPersonalWebhookURL,
        webhookBoard.id,
        i18n,
      );

      const createdWebhook = {
        ...newWebhook,
        idWorkspace: webhookBoard.idOrganization,
        boardName: webhookBoard.name,
        boardUrl: webhookBoard.url,
        author: {
          userId: userToUpdate.id,
          email: userToUpdate.email,
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

      // Update all users connected to the old webhook
      const updateUserOperations = usersWithoutOldAuthor.map(
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

          return {
            updateOne: {
              filter: { id: connectedUser.id },
              update: {
                $set: {
                  [UserSearchPath.TrelloWebhooks]: updatedWebhooks,
                },
              },
            },
          };
        },
      );

      await this.userService.updateManyUsers(updateUserOperations);

      // Remove webhook from previous author's webhooks
      try {
        const previousAuthor = await this.userService.findUserByTrelloId(
          existingWebhook.author.trelloUserId,
          i18n,
        );
        const filteredWebhooks = previousAuthor.trello.webhooks.filter(
          (userWebhook) => userWebhook.webhookId !== existingWebhook.id,
        );

        await this.userService.updateUser(
          previousAuthor,
          {
            trello: {
              ...previousAuthor.trello,
              webhooks: filteredWebhooks,
            },
          },
          i18n,
        );
      } catch (err) {
        this.logger.warn(
          err.message ||
            err.response.message ||
            `Previous author does not exist`,
        );
      }

      this.logger.log(
        `Old webhook for board ${existingWebhook.boardName} replaced with new webhook`,
      );

      return savedNewWebhook;
    }

    // If the webhook is still active, return the existing webhook
    return existingWebhook;
  }

  async webhookHealthCheck(
    webhook: Webhook | string,
    userToUpdate: User | string,
    i18n?: I18nContext,
  ): Promise<DefaultResponse<Webhook>> {
    const webhookToCheck = await this.getWebhook(webhook, i18n);

    const healthyWebhook = await this.recreateWebhookIfUnavailable(
      webhook,
      userToUpdate,
      i18n,
    );

    if (healthyWebhook.id !== webhookToCheck.id) {
      return {
        message:
          i18n?.t(I18nKeys.MESSAGES_TRELLO_WEBHOOK_WAS_RECREATED, {
            args: { board: webhookToCheck.boardName },
          }) ||
          `Webhook for board ${webhookToCheck.boardName} has been recreated`,
        statusCode: HttpStatus.OK,
        data: healthyWebhook,
      };
    } else {
      // If the webhook is still active, return the existing webhook
      return {
        message:
          i18n?.t(I18nKeys.MESSAGES_TRELLO_WEBHOOK_HEALTH_IS_OK, {
            args: { boardName: webhookToCheck.boardName },
          }) || `Webhook for board ${webhookToCheck.boardName} health is ok`,
        statusCode: HttpStatus.OK,
        data: webhookToCheck,
      };
    }
  }

  async getProfileNotifications(): Promise<NotificationProfiles> {
    const plans = await this.redisService.getSubscriptionPlans();

    return {
      basic: plans.basic,
      advanced: plans.advanced,
      full: plans.full,
    };
    // return {
    //   basic: plans.find((plan) => plan.name === SubscriptionPlans.BASIC)
    //     .notifications,
    //   advanced: plans.find((plan) => plan.name === SubscriptionPlans.ADVANCED)
    //     .notifications,
    //   full: plans.find((plan) => plan.name === SubscriptionPlans.FULL)
    //     .notifications,
    // };
  }

  async getWebhooksByCreatorToken(
    creatorToken: string,
    i18n?: I18nContext,
  ): Promise<any> {
    const tokenRelatedWebhooks =
      await this.trelloWebhookApiService.getWebhooksByToken(creatorToken, i18n);

    return tokenRelatedWebhooks;
  }

  async createTrelloWebhook(
    user: string | User,
    createWebhookDto: CreateWebhookDto,
    i18n?: I18nContext,
  ): Promise<DefaultResponse<Webhook>> {
    const { boardId } = createWebhookDto;
    const boardPersonalWebhookURL = `${this.webhookCallbackURL}/${boardId}`;
    let webhook = await this.trelloWebhookRepository.findOneByBoardId(boardId);

    const updateDate = new Date();
    const userToUpdate = await this.userService.getUser(user, i18n);

    validateTrelloToken(userToUpdate.trello.token, i18n);

    const decryptedUserToken = decryptText(
      userToUpdate.trello.token,
      this.encryptionKey,
    );

    const connectedBoard = await this.trelloBoardsApiService.fetchBoardById(
      decryptedUserToken,
      boardId,
      i18n,
    );

    const defaultProfileNotifications = (
      await this.subscriptionService.findSubscriptionByName(
        SubscriptionPlans.BASIC,
      )
    ).notifications;

    const defaultProfileEnabledActionKeys = [];

    for (const category of Object.keys(defaultProfileNotifications)) {
      for (const actionKey of Object.keys(
        defaultProfileNotifications[category],
      )) {
        if (defaultProfileNotifications[category][actionKey]) {
          defaultProfileEnabledActionKeys.push(actionKey);
        }
      }
    }

    if (webhook) {
      webhook = await this.recreateWebhookIfUnavailable(
        webhook,
        userToUpdate,
        i18n,
        connectedBoard,
      );

      // Webhook is still active; add the user as a subscriber if not already subscribed
      const webhookSubscribers = webhook.subscribers.map(
        (subscriber) => subscriber.trelloUserId,
      );

      if (!webhookSubscribers.includes(userToUpdate.trello.userId)) {
        webhook.subscribers.push({
          userId: userToUpdate.id,
          email: userToUpdate.email,
          trelloUserId: userToUpdate.trello.userId,
          trelloToken: userToUpdate.trello.token,
          notificationProfile: TrelloWebhookNotificationProfiles.BASIC,
        });
      }

      const defaultUserNotifications = initializeNotificationArrays(
        userToUpdate.trello.userId,
        defaultProfileEnabledActionKeys,
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
        lastActivityDate: updateDate,
      };

      await Promise.all([
        this.userService.updateUser(userToUpdate, updatedUserProps, i18n),
        this.trelloWebhookRepository.updateById(webhook.id, {
          subscribers: webhook.subscribers,
          notifications: updatedNotifications,
        }),
        this.notificationBotService.sendMessageToUser(
          userToUpdate.telegram,
          i18n?.t(I18nKeys.MESSAGES_GENERAL_NOTIFICATIONS_CONNECTED, {
            lang: userToUpdate.language,
            args: {
              boardName: webhook.boardName,
              boardUrl: webhook.boardUrl,
            },
          }) ||
            `Notifications for board [${webhook.boardName}](${webhook.boardUrl}) connected successfully`,
          false,
          [
            [
              {
                text: i18n?.t(I18nKeys.FIELDS_SETTINGS) || 'Settings',
                url: `${this.configService.get(configServiceKeys.FRONTEND_LINK)}/workspaces/${webhook.idWorkspace}/boards/${webhook.idModel}`,
              },
            ],
          ],
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
      i18n,
    );
    console.log('Webhook created: ', response);

    try {
      const createdWebhook = {
        id: response.id,
        idModel: response.idModel,
        idWorkspace: connectedBoard.idOrganization,
        callbackURL: response.callbackURL,
        boardName: connectedBoard.name,
        boardUrl: connectedBoard.url,
        author: {
          userId: userToUpdate.id,
          email: userToUpdate.email,
          trelloToken: userToUpdate.trello.token,
          trelloUserId: userToUpdate.trello.userId,
        },
        subscribers: [
          {
            userId: userToUpdate.id,
            email: userToUpdate.email,
            trelloToken: userToUpdate.trello.token,
            trelloUserId: userToUpdate.trello.userId,
            notificationProfile: TrelloWebhookNotificationProfiles.BASIC,
          },
        ],
        notifications: initializeNotificationArrays(
          userToUpdate.trello.userId,
          defaultProfileEnabledActionKeys,
        ),
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
        lastActivityDate: updateDate,
      };

      await Promise.all([
        this.userService.updateUser(user, updatedUserProps, i18n),
        this.trelloWebhookRepository.create(createdWebhook),
        this.notificationBotService.sendMessageToUser(
          userToUpdate.telegram,
          i18n?.t(I18nKeys.MESSAGES_GENERAL_NOTIFICATIONS_CONNECTED, {
            lang: userToUpdate.language,
            args: {
              boardName: createdWebhook.boardName,
              boardUrl: createdWebhook.boardUrl,
            },
          }) ||
            `Notifications for board [${createdWebhook.boardName}](${createdWebhook.boardUrl}) connected successfully`,
          false,
          [
            [
              {
                text: i18n?.t(I18nKeys.FIELDS_SETTINGS) || 'Settings',
                url: `${this.configService.get(configServiceKeys.FRONTEND_LINK)}/workspaces/${createdWebhook.idWorkspace}/boards/${createdWebhook.idModel}`,
              },
            ],
          ],
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
    i18n?: I18nContext,
  ): Promise<DefaultResponse<Webhook>> {
    const userToUpdate = await this.userService.getUser(user, i18n);
    const webhookToUpdate = await this.getWebhook(webhook, i18n);
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

    const newWebhook = await this.recreateWebhookIfUnavailable(
      webhook,
      userToUpdate,
      i18n,
      webhookToUpdate.idModel,
    );

    if (newWebhook.id !== webhookToUpdate.id) {
      throw new BadRequestException(
        i18n?.t(I18nKeys.MESSAGES_TRELLO_WEBHOOK_WAS_RECREATED) ||
          'Webhook has been recreated',
      );
    }

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

  async updateManyTrelloWebhookNotifications(
    user: string | User,
    updateManyWebhooksDto: UpdateManyNotificationsDto,
    i18n?: I18nContext,
  ): Promise<DefaultResponse<string>> {
    const userToUpdate = await this.userService.getUser(user, i18n);
    const updateDate = new Date();

    const { notificationProfile, notifications, webhooks } =
      updateManyWebhooksDto;
    validateTrelloToken(userToUpdate.trello.token, i18n);

    const failedUpdates: string[] = [];

    const webhooksToUpdate =
      await this.trelloWebhookRepository.findManyByIds(webhooks);

    const webhooksToUpdateIds = webhooksToUpdate.map((webhook) => webhook.id);

    const missingWebhooks = webhooks.filter(
      (webhook) =>
        !webhooksToUpdateIds.some(
          (webhookToUpdateId) => webhookToUpdateId === webhook,
        ),
    );

    failedUpdates.push(...missingWebhooks);

    const updatePromises = webhooksToUpdate.map(async (webhookToUpdate) => {
      const subscriberIds = webhookToUpdate.subscribers.map(
        (subscriber) => subscriber.trelloUserId,
      );

      if (!subscriberIds.includes(userToUpdate.trello.userId)) {
        throw new ForbiddenException(
          i18n?.t(I18nKeys.ERRORS_TRELLO_YOU_ARE_NOT_CONNECTED_TO_WEBHOOK) ||
            `You are not connected to this webhook`,
        );
      }

      const newWebhook = await this.recreateWebhookIfUnavailable(
        webhookToUpdate,
        userToUpdate,
        i18n,
        webhookToUpdate.idModel,
      );

      if (newWebhook.id !== webhookToUpdate.id) {
        throw new BadRequestException(
          i18n?.t(I18nKeys.MESSAGES_TRELLO_WEBHOOK_WAS_RECREATED) ||
            'Webhook was recreated',
        );
      }

      try {
        const updatedNotifications = getUpdatedWebhookNotifications(
          userToUpdate.trello.userId,
          webhookToUpdate.notifications,
          notifications,
        );

        const subscriberToUpdate = webhookToUpdate.subscribers.find(
          (subscriber) =>
            subscriber.trelloUserId === userToUpdate.trello.userId,
        );

        if (subscriberToUpdate) {
          subscriberToUpdate.notificationProfile = notificationProfile;
        }

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
          `Error updating webhook ${webhookToUpdate.boardName}:`,
          err.response ? err.response.data : err.message,
        );
        failedUpdates.push(webhookToUpdate.boardName);
        return;
      }
    });

    await Promise.all(updatePromises);

    await this.userService.updateUser(
      userToUpdate,
      {
        lastActivityDate: updateDate,
      },
      i18n,
    );

    return {
      message:
        failedUpdates.length > 0
          ? i18n?.t(I18nKeys.ERRORS_TRELLO_WEBHOOKS_BULK_FAIL, {
              args: { failedWebhooks: failedUpdates.join(', ') },
            }) || `Webhooks ${failedUpdates.join(', ')} failed to update`
          : i18n?.t(I18nKeys.MESSAGES_TRELLO_WEBHOOKS_WAS_UPDATED) ||
            `Webhooks has been updated successfully`,
      statusCode: HttpStatus.OK,
    };
  }

  async updateWebhooksForSubscribers(
    subscription: string | Subscription,
    newNotifications: any,
  ): Promise<void> {
    // Fetch the target subscription plan
    const targetSubscription =
      await this.subscriptionService.getSubscription(subscription);

    // Find all webhooks with subscribers using the given subscription name as their notification profile
    const webhooks =
      await this.trelloWebhookRepository.findAllWebhooksWithPlanSubscribers(
        targetSubscription.name as SubscriptionPlans,
      );

    if (!webhooks.length) return;

    // Update each webhook's notifications and subscribers' profiles
    await Promise.all(
      webhooks.map(async (webhook) => {
        const updatedNotifications = { ...webhook.notifications };

        // Iterate over each category
        for (const category of Object.keys(newNotifications)) {
          if (!updatedNotifications[category])
            updatedNotifications[category] = {};

          // Iterate over each action
          for (const action of Object.keys(newNotifications[category])) {
            const allowedUsers = webhook.notifications[category][action] || [];

            // Get all users who have the relevant notification profile for this webhook
            const usersToUpdate = webhook.subscribers
              .filter(
                (subscriber) =>
                  subscriber.notificationProfile === targetSubscription.name,
              )
              .map((subscriber) => subscriber.trelloUserId);

            // If the notification is enabled, ensure all users are listed
            if (newNotifications[category][action]) {
              updatedNotifications[category][action] = Array.from(
                new Set([...allowedUsers, ...usersToUpdate]),
              );
            } else {
              // Remove users from notifications if they are not allowed
              updatedNotifications[category][action] = allowedUsers.filter(
                (userId) => !usersToUpdate.includes(userId),
              );
            }
          }
        }

        // Update the webhook in the database
        await this.trelloWebhookRepository.updateById(webhook.id, {
          notifications: updatedNotifications,
        });

        console.log(`✅ Webhook ${webhook.id} updated successfully.`);
      }),
    );

    console.log(`✅ All related webhooks updated successfully.`);
  }

  async handleTrelloWebhook(webhookAction: any): Promise<any> {
    // delete webhookAction.model?.prefs;
    // delete webhookAction.model?.labelNames;
    // console.log(JSON.stringify(webhookAction, null, 2));

    const filteredLog = {
      webhookId: webhookAction.webhook?.id,
      actionType: webhookAction.action.type,
      translationKey: webhookAction.action.display?.translationKey,
      memberCreator: webhookAction.action.memberCreator?.username,
      targetMember: webhookAction.action.member?.username,
      modelName: webhookAction.model?.name,
      modelUrl: webhookAction.model?.url,
      actionDate: webhookAction.action.date,
    };

    console.log(JSON.stringify(filteredLog, null, 2));

    this.webhookActionCount += 1;
    this.logger.log(
      `Webhook id: ${webhookAction.model?.id}, application processed actions count: ${this.webhookActionCount}`,
    );

    const webhook = await this.trelloWebhookRepository.findOneById(
      webhookAction?.webhook?.id,
    );

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

    const generalActionType = webhookAction?.action?.type || '';
    let detailedActionType =
      webhookAction?.action?.display?.translationKey || '';
    const targetMember = webhookAction?.action?.member || '';
    const authorMember = webhookAction?.action?.memberCreator || '';
    const targetedChecklistUserId =
      webhookAction?.action?.data?.checkItem?.idMember ||
      webhookAction?.action?.data?.old?.idMember ||
      '';

    // to handle unknown detailed type actions which has clear generalActionType etc createCheckItem
    if (detailedActionType === 'unknown') {
      this.logger.warn(
        `unknown action type, general type: ${generalActionType}`,
      );
      detailedActionType = generalActionType;
    }

    this.logger.log(`Handling webhook ${detailedActionType} action...`);

    // Check if enum value includes action we got from webhook and transform enum key (CARD_CREATED -> cardCreated)
    const enumKey = getActionEnumKey(detailedActionType);

    // Get the category dynamically
    const matchingCategories = getCategoriesForAction(enumKey);

    if (matchingCategories.length === 0) {
      this.logger.warn(
        `Action ${detailedActionType} is not supported by this API.`,
      );
      return;
    }

    let boardData = null;
    let cardData = null;
    let boardMemberships: BoardMember[] | null;

    const batchRequestObject = {
      card: `/cards/${targetCard?.id}` || '',
      board: `/boards/${targetBoard?.id}` || '',
      boardMemberships: `/boards/${targetBoard?.id}/memberships` || '',
    };

    const batchResponseObject = await this.trelloBatchApiService.fetchManyUrls(
      batchRequestObject,
      authorizedToken,
    );

    if (targetBoard) {
      boardData = batchResponseObject.board || null;
      boardMemberships = batchResponseObject.boardMemberships || null;
      // boardData = await this.trelloBoardsApiService.fetchBoardById(
      //   authorizedToken,
      //   targetBoard.id,
      // );
    }

    if (targetCard) {
      cardData = batchResponseObject.card || null;
      // cardData = await this.trelloCardsApiService.fetchCardById(
      //   authorizedToken,
      //   targetCard.id,
      // );
    }

    let notifiedTargetUser: string | null = '';
    let notifiedAuthorUser: string | null = '';

    if (
      (targetedChecklistUserId &&
        authorMember?.id === targetedChecklistUserId) ||
      (!targetedChecklistUserId && !targetMember?.id) ||
      (targetMember?.id && authorMember?.id === targetMember?.id)
    ) {
      notifiedAuthorUser = authorMember?.id;
    }

    for (const category of matchingCategories) {
      const actionSubscribers =
        webhook.notifications[category]?.[enumKey] || [];

      if (
        actionSubscribers.length === 0 ||
        (actionSubscribers.length === 1 &&
          actionSubscribers.includes(notifiedAuthorUser))
      ) {
        this.logger.warn(
          `Nobody tracks ${enumKey} action in category ${category}.`,
        );
        continue;
      }

      //separate handler because checklist memeber actions does not have
      // webhookAction?.action?.member even though it is targeted action
      if (
        detailedActionType ===
          TrelloWebhookDetailedActions.CHECKLIST_ITEM_MEMBER_ADDED ||
        detailedActionType ===
          TrelloWebhookDetailedActions.CHECKLIST_ITEM_MEMBER_REMOVED
      ) {
        if (actionSubscribers.includes(targetedChecklistUserId))
          await this.actionsService.handlePersonalAction(
            targetedChecklistUserId,
            boardData,
            detailedActionType,
            webhookAction,
            webhook,
            cardData
              ? await this.trelloCardsApiService.fetchCardById(
                  authorizedToken,
                  targetCard.id,
                )
              : null,
          );
        notifiedTargetUser = targetedChecklistUserId;
      }

      if (targetMember && actionSubscribers.includes(targetMember.id)) {
        await this.actionsService.handlePersonalAction(
          targetMember.id,
          boardData,
          detailedActionType,
          webhookAction,
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

      switch (category) {
        case TrelloWebhookNotificationCategories.CARD:
          if (
            detailedActionType === TrelloWebhookDetailedActions.CARD_CREATED
          ) {
            boardMemberships =
              boardMemberships ??
              (await this.trelloBoardsApiService.fetchBoardMemberships(
                authorizedToken,
                boardData.id,
              ));

            const membersToNotify = boardMemberships
              .filter(
                (member) =>
                  actionSubscribers.includes(member.idMember) &&
                  member.idMember !== notifiedTargetUser &&
                  member.idMember !== notifiedAuthorUser,
              )
              .map((member) => member.idMember);

            await this.actionsService.handleCardActions(
              membersToNotify,
              boardData,
              cardData
                ? await this.trelloCardsApiService.fetchCardById(
                    authorizedToken,
                    targetCard.id,
                  )
                : null,
              detailedActionType,
              webhookAction,
            );
          } else {
            if (cardData) {
              const cardMembers = cardData.idMembers || [];
              const membersToNotify = cardMembers.filter(
                (memberId) =>
                  actionSubscribers.includes(memberId) &&
                  memberId !== notifiedTargetUser &&
                  memberId !== notifiedAuthorUser,
              );

              await this.actionsService.handleCardActions(
                membersToNotify,
                boardData,
                cardData,
                detailedActionType,
                webhookAction,
              );
            }
          }
          break;

        case TrelloWebhookNotificationCategories.CHECKLIST:
          if (cardData) {
            const cardMembers = cardData.idMembers || [];
            const membersToNotify = cardMembers.filter(
              (memberId) =>
                actionSubscribers.includes(memberId) &&
                memberId !== notifiedTargetUser &&
                memberId !== notifiedAuthorUser,
            );

            await this.actionsService.handleChecklistActions(
              membersToNotify,
              boardData,
              cardData,
              detailedActionType,
              webhookAction,
            );
          }
          break;

        case TrelloWebhookNotificationCategories.LIST:
          if (boardData) {
            boardMemberships =
              boardMemberships ??
              (await this.trelloBoardsApiService.fetchBoardMemberships(
                authorizedToken,
                boardData.id,
              ));

            const membersToNotify = boardMemberships
              .filter(
                (member) =>
                  actionSubscribers.includes(member.idMember) &&
                  member.idMember !== notifiedTargetUser &&
                  member.idMember !== notifiedAuthorUser,
              )
              .map((member) => member.idMember);

            await this.actionsService.handleListActions(
              membersToNotify,
              boardData,
              detailedActionType,
              webhookAction,
            );
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

            const membersToNotify = boardMemberships
              .filter(
                (member) =>
                  actionSubscribers.includes(member.idMember) &&
                  member.idMember !== notifiedTargetUser &&
                  member.idMember !== notifiedAuthorUser,
              )
              .map((member) => member.idMember);

            await this.actionsService.handleBoardActions(
              membersToNotify,
              boardData,
              detailedActionType,
              webhookAction,
            );
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
    const userToUpdate = await this.userService.getUser(user, i18n);
    const webhookToUpdate = await this.getWebhook(webhook, i18n);
    const updateDate = new Date();

    validateTrelloToken(userToUpdate.trello.token, i18n);

    if (
      !userToUpdate.trello.webhooks.find(
        (userWebhook) => userWebhook.webhookId === webhookToUpdate.id,
      )
    ) {
      throw new BadRequestException(
        i18n?.t(I18nKeys.ERRORS_TRELLO_USER_IS_NOT_CONNECTED_TO_WEBHOOK, {
          args: { webhookToDisconnect: webhookToUpdate.boardName },
        }),
        `User is not connected to webhook ${webhookToUpdate.boardName}`,
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
      lastActivityDate: updateDate,
    };

    const filteredWebhookData = filterUserFromWebhook(
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
      this.userService.updateUser(userToUpdate, updatedUser, i18n),

      this.notificationBotService.sendMessageToUser(
        userToUpdate.telegram,
        i18n?.t(I18nKeys.MESSAGES_GENERAL_NOTIFICATIONS_DISCONNECTED, {
          args: {
            boardName: webhookToUpdate?.boardName,
            boardUrl: webhookToUpdate?.boardUrl,
          },
          lang: userToUpdate.language || Languages.EN,
        }) ||
          `Notifications for board [${webhookToUpdate.boardName}](${webhookToUpdate.boardUrl}) has been disconnected.`,
        false,
        [
          [
            {
              text: i18n?.t(I18nKeys.FIELDS_DASHBOARD) || 'Dashboard',
              url: `${this.configService.get(configServiceKeys.FRONTEND_LINK)}/workspaces/${webhookToUpdate.idWorkspace}`,
            },
          ],
        ],
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
          message:
            i18n?.t(I18nKeys.MESSAGES_USER_ALL_WEBHOOKS_DISCONNECTED, {
              args: { email: userToDisconnect.email },
            }) ||
            `User ${userToDisconnect.email} disconnected from all Trello webhooks successfully`,
          statusCode: HttpStatus.OK,
        };
      }

      const webhooksToClearIds = userToDisconnect.trello.webhooks.map(
        (webhookToClear) => webhookToClear.webhookId,
      );

      const webhooksToClear =
        await this.trelloWebhookRepository.findManyByIds(webhooksToClearIds);

      //we create array of mongo operations to call them later in one request
      const bulkUpdateOperations = webhooksToClear.map(
        (webhookToDisconnect) => {
          const updateObject: any = {
            $pull: {
              [WebhookSearchPath.Subscribers]: {
                trelloUserId: userToDisconnect.trello.userId, // Match objects with the specific `trelloUserId`
              },
            },
          };

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
        },
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

      await this.userService.updateUser(
        userToDisconnect,
        updatedUserProps,
        i18n,
      );

      return {
        message: `User ${userToDisconnect.id} disconnected from all Trello webhooks successfully`,
        statusCode: HttpStatus.OK,
      };
    } catch (err) {
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
      await this.userService.removeWebhookFromAllUsers(webhookToDelete, i18n);

      await this.trelloWebhookRepository.deleteById(webhookId);

      this.logger.log(
        `Webhook for model ${webhookToDelete.boardName} deleted successfully`,
      );
      return {
        message: `Webhook ${webhookId} deleted successfully from Trello and all connected users`,
        statusCode: HttpStatus.OK,
      };
    } catch (err) {
      this.logger.error(
        'Error deleting webhook:',
        err.response ? err.response.message : err.message,
      );
      throw new BadRequestException(
        err.response ? err.response.message : err.message,
      );
    }
  }

  async removeAllWebhooksCreatedByUser(
    user: User | string,
    i18n?: I18nContext,
  ): Promise<DefaultResponse<null>> {
    const userToCheck = await this.userService.getUser(user, i18n);

    const webhooksToDelete =
      await this.trelloWebhookRepository.findWebhooksCreatedByUser(
        userToCheck.trello.userId,
      );

    if (!webhooksToDelete.length) {
      return {
        message: `No webhooks found for user: ${userToCheck.trello.userId}`,
        statusCode: HttpStatus.OK,
      };
    }

    await Promise.all(
      webhooksToDelete.map((webhook) =>
        this.removeTrelloWebhook(webhook, i18n),
      ),
    );

    return {
      message: `Removed ${webhooksToDelete.length} webhooks created by user: ${userToCheck.trello.userId}`,
      statusCode: HttpStatus.OK,
    };
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
        webhooks.map((webhook) => this.removeTrelloWebhook(webhook, i18n)),
      );

      this.logger.log('All webhooks deleted successfully.');
      return {
        message:
          'All webhooks deleted successfully from Trello and all connected users.',
        statusCode: HttpStatus.OK,
      };
    } catch (err) {
      this.logger.error(
        'Error deleting all webhooks:',
        err.response ? err.response.message : err.message,
      );
      throw new BadRequestException(
        err.response ? err.response.message : err.message,
      );
    }
  }
}
