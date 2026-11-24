import { randomUUID } from 'crypto';
import {
  ConflictException,
  HttpStatus,
  Injectable,
  NotFoundException,
  Logger,
  ForbiddenException,
  forwardRef,
  Inject,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  TrelloMembersLogicService,
  TrelloTokensLogicService,
  TrelloWebhooksLogicService,
} from '@trello/logic';
import { addDays } from 'date-fns';
import { I18nContext, I18nService } from 'nestjs-i18n';
import { AdminBotActions } from 'src/common/enums/admin-bot-actions.enum';
import { configServiceKeys } from 'src/common/enums/config-service-keys.enum';
import { I18nKeys } from 'src/common/enums/i18n-keys.enum';
import { Languages } from 'src/common/enums/languages.enum';
import {
  decryptText,
  encryptText,
  hashPassword,
} from 'src/common/helpers/hashing';
import {
  DefaultPaginatedResponse,
  DefaultResponse,
} from 'src/common/interfaces/responses';
import { SharedConfigService } from 'src/config/services/shared.config.service';
import { DiscordService } from 'src/discord/discord.service';
import { MailerService } from 'src/mailer/services/mailer.service';
import { PaypalLogicService } from 'src/paypal/services/paypal-logic.service';
import { periodStatsKeys } from 'src/redis/enums/daily-stats-keys.enum';
import { RedisService } from 'src/redis/services/redis.service';
import { Subscription } from 'src/subscription/entities/subscription.entity';
import { SubscriptionPlans } from 'src/subscription/enum/subscription-plan.enum';
import { SubscriptionService } from 'src/subscription/services/subscription.service';
import { UsedTrialService } from 'src/subscription/services/used-trial.service';
import { AdminBotService } from 'src/telegram/admin-bot/admin-bot.service';
import { NotificationBotService } from 'src/telegram/notification-bot/notification-bot.service';

import { Webhook } from 'src/trello/entities/webhook.entity';
import { ConnectTelegramDto } from '../dto/connect-telegram.dto';
import { ConnectTrelloDto } from '../dto/connect-trello.dto';
import { ContactUsDto } from '../dto/contact-us.dto';
import { CreateUserDto } from '../dto/create-user.dto';
import { DiscordSettings } from '../dto/discord.settings.dto';
import { UpdateUserPreferencesDto } from '../dto/update-user-preferences.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { UserQueryDto } from '../dto/user.query.dto';
import { User } from '../entities/user.entity';
import { UserSearchPath } from '../enums/query.enum';
import { UserRoles } from '../enums/role.enum';

import { UsersRepository } from '../repositories/users.repository';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);
  private readonly encryptionKey: string;

  constructor(
    private readonly userRepository: UsersRepository,
    private readonly configService: ConfigService,
    private readonly sharedConfigService: SharedConfigService,
    private readonly trelloMembersLogicService: TrelloMembersLogicService,
    private readonly trelloTokensLogicService: TrelloTokensLogicService,
    private readonly trelloWebhooksLogicService: TrelloWebhooksLogicService,
    private readonly notificationBotService: NotificationBotService,
    private readonly adminBotService: AdminBotService,
    private readonly discordService: DiscordService,
    @Inject(forwardRef(() => SubscriptionService))
    private readonly subscriptionService: SubscriptionService,
    @Inject(forwardRef(() => PaypalLogicService))
    private readonly paypalLogicService: PaypalLogicService,
    private readonly usedTrialService: UsedTrialService,
    @Inject(forwardRef(() => RedisService))
    private readonly redisService: RedisService,
    private readonly mailerService: MailerService,
    private readonly i18nService: I18nService,
  ) {
    this.encryptionKey = this.sharedConfigService.getEncryptionKey();
  }

  public async getUser(user: string | User, i18n?: I18nContext): Promise<User> {
    if (typeof user === 'string') {
      // If it's a string, fetch the user by ID
      return await this.findUserById(user, i18n);
    }
    return user; // If it's already a User object, return it as-is
  }

  //all commented parts will be used when payments will be implemented
  //lifetimeSubscriptionPlan should be changed to trialSubscriptionPlan then
  public async createUser(
    createUserDto: CreateUserDto,
    i18n?: I18nContext,
  ): Promise<User> {
    this.logger.log(`Creating user with email: ${createUserDto.email}`);

    const userByEmail = await this.userRepository.findOneByEmail(
      createUserDto.email,
    );

    if (userByEmail) {
      this.logger.warn(`User ${createUserDto.email} already exists`);
      throw new ConflictException(
        i18n?.t(I18nKeys.ERRORS_USER_ALREADY_EXIST, {
          args: { email: createUserDto.email },
        }) || `User ${createUserDto.email} already exists`,
      );
    }

    const trialSubscriptionPlan =
      await this.subscriptionService.findSubscriptionByName(
        SubscriptionPlans.TRIAL,
        i18n,
      );

    let trialExpired = false;
    const currentDate = new Date();
    const usedTrial = await this.usedTrialService.findUserTrialByEmail(
      createUserDto.email,
    );

    if (usedTrial?.trialEnds < currentDate) {
      trialExpired = true;
    }

    const newUser = {
      id: randomUUID(),
      ...createUserDto,
      password: await hashPassword(createUserDto.password),
      subscription: {
        id: trialSubscriptionPlan.id,
        plan: trialSubscriptionPlan.name,
        lastAmount: 0,
        totalAmount: 0,
        expired: trialExpired,
        isCancelled: false,
        isPaused: false,
        lastPaymentDate: null,
        nextPaymentDate:
          usedTrial?.trialEnds ||
          (() => {
            const date = new Date();
            date.setDate(date.getDate() + 14);
            return date;
          })(),
        paypalSubscriptionId: null,
        lastPaymentId: null,
      },
      trello: { userId: null, token: null, webhooks: [], updatedAt: null },
      telegram: {
        username: null,
        chatId: null,
        updatedAt: null,
      },
      discord: {
        userId: null,
        username: null,
        updatedAt: null,
      },
    };

    const createdUser = await this.userRepository.create(newUser);

    if (!usedTrial) {
      await this.usedTrialService.createUsedTrial({
        email: createdUser.email,
        userId: createdUser.id,
        trelloUserId: null,
        trialStarts: createdUser.createdAt,
        trialEnds: createdUser.subscription.nextPaymentDate,
      });
      this.logger.log(
        `User with email ${createdUser.email} gain trial subscription to ${createdUser.subscription.nextPaymentDate}`,
      );
    }

    await this.redisService.updateDailyStats(
      periodStatsKeys.NEW_USERS,
      newUser.email,
    );

    await this.redisService.updateWeeklyStats(
      periodStatsKeys.NEW_USERS,
      newUser.email,
    );

    if (createdUser) {
      await this.subscriptionService.addSubscriberToPlan(
        trialSubscriptionPlan,
        createdUser,
        i18n,
      );
    }

    this.logger.log(
      `User with email ${createdUser.email} created successfully`,
    );
    return createdUser;
  }

  public async deleteUserById(
    requestedAuthor: string | User,
    userToDelete: string | User,
    i18n?: I18nContext,
  ): Promise<DefaultResponse<null>> {
    const requestAuthor = await this.getUser(requestedAuthor, i18n);
    const targetUser = await this.getUser(userToDelete, i18n);

    // Check if the requesting user is allowed to delete the target user
    if (
      requestAuthor.role !== UserRoles.superadmin &&
      requestAuthor.id !== targetUser.id
    ) {
      throw new ForbiddenException(
        i18n?.t(I18nKeys.ERRORS_GENERAL_FORBIDDEN_RESOURCE) ||
          'Forbidden resource',
      );
    }

    // Prevent a superadmin from deleting themselves
    if (
      requestAuthor.role === UserRoles.superadmin &&
      requestAuthor.id === targetUser.id
    ) {
      throw new ForbiddenException(
        i18n?.t(I18nKeys.ERRORS_GENERAL_FORBIDDEN_RESOURCE) ||
          'Forbidden resource',
      );
    }

    this.logger.log(`Deleting user with ID: ${targetUser.id}`);

    // Disconnect the user from Trello webhooks if they have a token
    if (targetUser.trello.token) {
      await this.trelloWebhooksLogicService.disconnectFromAllTrelloWebhooks(
        targetUser,
        i18n,
      );

      const authorWebhooks =
        await this.trelloWebhooksLogicService.findMyCreatedWebhooks(
          targetUser,
          i18n,
        );

      const notificationPromises = authorWebhooks.map(async (webhook) => {
        webhook.subscribers.map(async (subscriber) => {
          const subscriberToNotify = await this.findUserByTrelloId(
            subscriber.trelloUserId,
          );

          this.notificationBotService.sendMessageToUser(
            subscriberToNotify.telegram,
            i18n?.t(I18nKeys.MESSAGES_GENERAL_NOTIFICATIONS_DISCONNECTED, {
              args: {
                boardName: webhook.boardName,
                boardUrl: webhook.boardUrl,
              },
            }) ||
              `Notifications for board [${webhook.boardName}](${webhook.boardUrl}) has been disconnected. Please, check notifications status`,
          );
        });
      });

      await Promise.all(notificationPromises);

      // await this.trelloWebhooksLogicService.removeAllWebhooksCreatedByUser(
      //   targetUser,
      //   i18n,
      // );

      const decryptedTargetUserToken = decryptText(
        targetUser.trello.token,
        this.encryptionKey,
      );

      await this.trelloTokensLogicService.deleteUserToken(
        decryptedTargetUserToken,
        i18n,
      );
    }

    // Perform the user deletion
    await this.userRepository.delete(targetUser.id);

    await this.subscriptionService.removeSubscriberFromPlan(
      targetUser.subscription.id,
      targetUser,
    );

    if (
      targetUser?.subscription?.paypalSubscriptionId &&
      !targetUser?.subscription?.isCancelled
    ) {
      try {
        await this.subscriptionService.cancelPaypalSubscription(
          targetUser?.subscription?.paypalSubscriptionId,
          'User deleted from Trellify',
        );
      } catch (err) {
        this.logger.warn(err);
      }
    }

    const notificationMessage =
      await this.adminBotService.actionAdminNotification(
        AdminBotActions.USER_DELETED,
        targetUser,
      );

    await this.adminBotService.notifyAdmins(notificationMessage);

    await this.redisService.updateDailyStats(
      periodStatsKeys.DELETED_USERS,
      targetUser.email,
    );

    await this.redisService.updateWeeklyStats(
      periodStatsKeys.DELETED_USERS,
      targetUser.email,
    );

    this.logger.log(`User ${targetUser.email} deleted successfully`);
    return {
      message:
        i18n?.t(I18nKeys.MESSAGES_USER_DELETED, {
          args: {
            email: targetUser.email,
          },
        }) || `All user data ${targetUser.email} has been deleted successfully`,
      statusCode: HttpStatus.OK,
    };
  }

  public async findAll(
    filters: UserQueryDto = {},
  ): Promise<DefaultPaginatedResponse<User>> {
    return this.userRepository.getAll(filters);
  }

  public async findTotal(): Promise<number> {
    return this.userRepository.getTotal();
  }

  public async findUserById(id: string, i18n?: I18nContext): Promise<User> {
    const user = await this.userRepository.findOneById(id);
    if (!user) {
      this.logger.warn(`User with ID ${id} not found`);
      throw new NotFoundException(
        i18n?.t(I18nKeys.ERRORS_USER_NOT_FOUND_BY_ID, {
          args: { id },
        }) || `User with id ${id} not found`,
      );
    }

    const userWithoutPass = { ...user };
    delete userWithoutPass.password;
    return userWithoutPass;
  }

  public async findUserByEmail(
    email: string,
    i18n?: I18nContext,
  ): Promise<User> {
    const user = await this.userRepository.findOneByEmail(email);

    if (!user) {
      this.logger.warn(`User with email ${email} not found`);
      throw new NotFoundException(
        i18n?.t(I18nKeys.ERRORS_USER_NOT_FOUND_BY_EMAIL, {
          args: { email },
        }) || `User with email ${email} does not exists`,
      );
    }

    return user;
  }

  public async findUserProfile(
    user: string | User,
    i18n?: I18nContext,
  ): Promise<Partial<User>> {
    const userToFind = await this.getUser(user, i18n);

    delete userToFind.password;
    delete userToFind.telegram?.chatId;
    delete userToFind.trello?.token;

    return userToFind;
  }

  public async findUserByTrelloId(
    trelloUserId: string,
    i18n?: I18nContext,
  ): Promise<User> {
    const userByTrelloId =
      await this.userRepository.findOneByTrelloId(trelloUserId);

    if (!userByTrelloId) {
      this.logger.warn(`User with Trello ID ${trelloUserId} not found`);
      throw new NotFoundException(
        i18n?.t(I18nKeys.ERRORS_USER_NOT_FOUND_BY_TRELLO_ID, {
          args: { trelloUserId },
        }) || `User with Trello ID ${trelloUserId} not found`,
      );
    }

    return userByTrelloId;
  }

  public async findUsersByTrelloIds(trelloUserIds: string[]): Promise<User[]> {
    const usersByTrelloId =
      await this.userRepository.findManyByTrelloIds(trelloUserIds);

    return usersByTrelloId;
  }

  public async findUsersConnectedToWebhook(webhookId: string): Promise<User[]> {
    return this.userRepository.findUsersConnectedToWebhook(webhookId);
  }

  public async findWebhooksUserIsSubscribedOn(
    user: string | User,
    i18n?: I18nContext,
  ): Promise<Webhook[]> {
    const subscriber = await this.getUser(user, i18n);

    const webhooks =
      await this.trelloWebhooksLogicService.findUserSubscribedWebhooks(
        subscriber,
        i18n,
      );

    return webhooks;
  }

  public async findUserByProperty(
    path: UserSearchPath,
    value: any,
    i18n?: I18nContext,
  ): Promise<User> {
    const user = await this.userRepository.findUserByProperty(path, value);
    if (!user) {
      this.logger.warn(`User with property ${path}: ${value} not found`);
      throw new NotFoundException(
        i18n?.t(I18nKeys.ERRORS_USER_NOT_FOUND_BY_PROPERTY, {
          args: { path, value },
        }) || `User with property ${path}: ${value} not found`,
      );
    }

    this.logger.log(`User with property ${path}: ${value} found`);
    delete user.password;
    return user;
  }

  public async doesUserExist(email: string): Promise<boolean> {
    this.logger.log(`Checking if user exists with email: ${email}`);
    return await this.userRepository.existsByEmail(email);
  }

  public async updateUserEmail(
    user: string | User,
    newEmail: string,
    i18n?: I18nContext,
  ): Promise<User> {
    const userToUpdate = await this.getUser(user);

    const oldEmail = userToUpdate.email;

    if (oldEmail === newEmail) {
      throw new ConflictException(
        i18n?.t(I18nKeys.ERRORS_AUTH_CHANGE_EMAIL_SAME_ADRESS) ||
          'New email must be different from current',
      );
    }

    const isEmailUsed = await this.doesUserExist(newEmail);

    if (isEmailUsed) {
      throw new ConflictException(
        i18n?.t(I18nKeys.ERRORS_USER_ALREADY_EXIST, {
          args: {
            email: newEmail,
          },
        }) || `User ${newEmail} already exists`,
      );
    }

    const createdWebhooks =
      await this.trelloWebhooksLogicService.findMyCreatedWebhooks(
        userToUpdate,
        i18n,
      );

    const connectedWebhooks =
      await this.trelloWebhooksLogicService.findMyConnectedWebhooks(
        userToUpdate,
        i18n,
      );

    const operations: any[] = [];

    // Prepare bulk operations for createdWebhooks (update author.email)
    for (const webhook of createdWebhooks) {
      operations.push({
        updateOne: {
          filter: { id: webhook.id },
          update: { 'author.email': newEmail },
        },
      });
    }

    // Prepare bulk operations for connectedWebhooks (update subscriber emails)
    for (const webhook of connectedWebhooks) {
      const needsUpdate = webhook.subscribers.some(
        (subscriber: any) => subscriber.email === oldEmail,
      );

      if (needsUpdate) {
        const updatedSubscribers = webhook.subscribers.map((subscriber: any) =>
          subscriber.email === oldEmail
            ? { ...subscriber, email: newEmail }
            : subscriber,
        );

        operations.push({
          updateOne: {
            filter: { id: webhook.id },
            update: { subscribers: updatedSubscribers },
          },
        });
      }
    }

    if (operations.length > 0) {
      await this.trelloWebhooksLogicService.updateManyWebhooks(operations);
    }

    const updatedUser = await this.userRepository.updateById(userToUpdate.id, {
      email: newEmail,
    });

    return updatedUser;
  }

  public async updateUser(
    user: string | User,
    updateUserDto: UpdateUserDto,
    i18n?: I18nContext,
    reqUser?: Partial<User>,
  ): Promise<DefaultResponse<User>> {
    const userToUpdate = await this.getUser(user, i18n);

    if (updateUserDto.email) {
      const updatedUser = await this.updateUserEmail(
        user,
        updateUserDto.email,
        i18n,
      );
      return {
        message:
          i18n?.t(I18nKeys.MESSAGES_USER_UPDATED, {
            args: {
              email: userToUpdate.email,
            },
          }) || `User ${userToUpdate.email} updated successfully`,
        statusCode: HttpStatus.OK,
        data: updatedUser,
      };
    }

    //do not let update roles for not superadmins, and do not let superadmin lower his role
    if (
      reqUser?.role !== UserRoles.superadmin ||
      (reqUser?.role === UserRoles.superadmin &&
        userToUpdate.id === reqUser?.id)
    ) {
      delete updateUserDto.role;
    }

    const updatedUserProps: Partial<User> = {};

    for (const [key, value] of Object.entries(updateUserDto)) {
      if (key === 'trello' && value) {
        updatedUserProps.trello = { ...userToUpdate.trello, ...value };
        if (value.token) {
          if (
            !userToUpdate.trello.token ||
            userToUpdate.trello.token !== value.token
          ) {
            updatedUserProps.trello.token = encryptText(
              value.token,
              this.encryptionKey,
            );
          } else {
            updatedUserProps.trello.token = userToUpdate.trello.token;
          }
        }

        const trelloToken =
          updatedUserProps.trello.token || userToUpdate.trello.token;
        if (updateUserDto.trello.token) {
          const trelloProfile =
            await this.trelloMembersLogicService.findMemberProfile(
              userToUpdate,
              trelloToken,
              i18n,
            );

          updatedUserProps.trello.userId = trelloProfile.id;
        }

        if (value.webhooks) {
          updatedUserProps.trello.webhooks = value.webhooks;
        }
      } else if (key === 'telegram' && value) {
        updatedUserProps.telegram = { ...userToUpdate.telegram, ...value };
      } else if (value !== undefined) {
        updatedUserProps[key] = value;
      }
    }

    const updatedUser = await this.userRepository.updateById(
      userToUpdate.id,
      updatedUserProps,
    );

    delete updatedUser.password;

    return {
      message:
        i18n?.t(I18nKeys.MESSAGES_USER_UPDATED, {
          args: {
            email: userToUpdate.email,
          },
        }) || `User ${userToUpdate.email} updated successfully`,
      statusCode: HttpStatus.OK,
      data: updatedUser,
    };
  }

  public async updateManyUsers(operations: any[]) {
    return await this.userRepository.bulkUpdateUsers(operations);
  }

  public async updateUserPreferences(
    user: string | User,
    updateUserPreferencesDto: UpdateUserPreferencesDto,
    i18n?: I18nContext,
  ): Promise<DefaultResponse<User>> {
    const userToUpdate = await this.getUser(user, i18n);
    const updateDate = new Date();

    const updatedFields: Partial<User> = {
      lastActivityDate: updateDate,
    };

    if (updateUserPreferencesDto.language) {
      updatedFields.language = updateUserPreferencesDto.language;
    }
    if (updateUserPreferencesDto.timezone !== undefined) {
      updatedFields.timezone = updateUserPreferencesDto.timezone;
    }

    const updatedUser = await this.userRepository.updateById(
      userToUpdate.id,
      updatedFields,
    );

    return {
      message: `User ${userToUpdate.id} preferences updated successfully`,
      statusCode: HttpStatus.OK,
      data: updatedUser,
    };
  }

  //superadmin subscription change
  public async updateUserSubscription(
    user: string | User,
    subscription: string | Subscription,
    reqUser: Partial<User>,
    i18n?: I18nContext,
  ): Promise<DefaultResponse<User>> {
    const userToUpdate = await this.getUser(user, i18n);
    const adminUser = await this.getUser(reqUser.id);

    if (adminUser.role !== UserRoles.superadmin) {
      throw new ForbiddenException(
        i18n?.t(I18nKeys.ERRORS_GENERAL_FORBIDDEN_RESOURCE) ||
          `Forbidden resource`,
      );
    }

    // order matters
    const oldSubscription = await this.subscriptionService.getSubscription(
      userToUpdate.subscription.id,
    );

    const newSubscription =
      await this.subscriptionService.getSubscription(subscription);

    if (newSubscription?.name !== SubscriptionPlans.LIFETIME) {
      throw new BadRequestException(
        'Only lifetime plan could be given manually',
      );
    }

    if (oldSubscription?.name === newSubscription?.name) {
      throw new ConflictException('User already has the same subscription');
    }

    await this.subscriptionService.removeSubscriberFromPlan(
      oldSubscription,
      userToUpdate.id,
    );

    await this.subscriptionService.addSubscriberToPlan(
      newSubscription,
      userToUpdate.id,
    );

    const updatedUser = await this.userRepository.updateById(userToUpdate.id, {
      subscription: {
        ...userToUpdate.subscription,
        id: newSubscription.id,
        plan: newSubscription.name as SubscriptionPlans,
        expired:
          newSubscription.name === SubscriptionPlans.LIFETIME
            ? false
            : userToUpdate.subscription.expired,
        nextPaymentDate:
          newSubscription.name === SubscriptionPlans.LIFETIME
            ? null
            : userToUpdate.subscription.nextPaymentDate,
      },
    });

    return {
      message:
        i18n?.t(I18nKeys.MESSAGES_USER_SUBSCRIPTION_UPDATED, {
          args: {
            email: userToUpdate.email,
            subscription: newSubscription.name,
          },
        }) ||
        `User ${userToUpdate.email} subscription plan successfully changed to ${newSubscription.name} plan`,
      statusCode: HttpStatus.OK,
      data: updatedUser,
    };
  }

  public async resetPassword(
    id: string,
    newPassword: string,
    i18n?: I18nContext,
  ): Promise<void> {
    const userToReset = await this.getUser(id, i18n);
    const encryptedPassword = await hashPassword(newPassword);
    const updateDate = new Date();

    await this.userRepository.updateById(userToReset.id, {
      password: encryptedPassword,
      lastActivityDate: updateDate,
    });
    this.logger.log(`Password for user with ID ${id} reset successfully`);
  }

  public async manageUserTelegramConnection(
    userId: string | User,
    reqUser: string | User,
    connectTelegramDto: ConnectTelegramDto,
    i18n?: I18nContext,
  ): Promise<DefaultResponse<User>> {
    const userToUpdate = await this.getUser(userId, i18n);

    const requestedUser = await this.getUser(reqUser, i18n);
    const isUpdatingSomeoneElse = userToUpdate.id !== requestedUser.id;

    const isNotSuperadmin = requestedUser.role !== UserRoles.superadmin;
    const targetIsSuperadmin = userToUpdate.role === UserRoles.superadmin;

    if (isNotSuperadmin && (isUpdatingSomeoneElse || targetIsSuperadmin)) {
      throw new ForbiddenException(
        i18n?.t(I18nKeys.ERRORS_GENERAL_FORBIDDEN_RESOURCE) ||
          'Forbidden resource',
      );
    }

    const { chatId, username } = connectTelegramDto;

    const updateDate = new Date();

    if (chatId && username) {
      const connectedUser = await this.userRepository.findUserByProperty(
        UserSearchPath.TelegramChatId,
        chatId,
      );

      if (connectedUser?.telegram.chatId) {
        throw new ConflictException(
          i18n?.t(I18nKeys.ERRORS_TELEGRAM_BOT_ALREADY_CONNECTED) ||
            `This telegram account is already connected to Trellify`,
        );
      }
    } else {
      await this.notificationBotService.sendMessageToUser(
        userToUpdate.telegram,
        i18n?.t(I18nKeys.MESSAGES_GENERAL_DISCONNECTION_MESSAGE, {
          lang: userToUpdate.language,
        }) || `Trellify bot disconnected successfully`,
      );
    }

    const updatedUser = await this.userRepository.updateById(userToUpdate.id, {
      telegram: { chatId, username, updatedAt: updateDate },
      lastActivityDate: updateDate,
    });

    await this.notificationBotService.sendMessageToUser(
      connectTelegramDto,
      i18n?.t(I18nKeys.MESSAGES_GENERAL_CONNECTION_MESSAGE, {
        args: {
          workspacesLink: `${this.configService.get(configServiceKeys.FRONTEND_LINK)}/workspaces`,
        },
        lang: userToUpdate.language,
      }) || `Trellify authorized successfully`,
    );

    this.logger.log(
      `Telegram ${username} ${chatId ? 'connected' : 'disconnected'} successfully by ${
        reqUser
          ? typeof reqUser === 'string'
            ? reqUser
            : reqUser.email
          : 'self'
      }`,
    );

    return {
      message:
        i18n?.t(
          chatId
            ? I18nKeys.MESSAGES_TELEGRAM_CONNECTED_SUCCESSFULLY
            : I18nKeys.MESSAGES_TELEGRAM_DISCONNECTED_SUCCESSFULLY,
        ) || `Telegram ${chatId ? 'connected' : 'disconnected'} successfully`,
      statusCode: HttpStatus.OK,
      data: updatedUser,
    };
  }

  public async manageUserDiscordConnection(
    targetUser: string | User,
    reqUser: string | User,
    connectDiscordDto: DiscordSettings,
    i18n?: I18nContext,
  ): Promise<DefaultResponse<User>> {
    const userToUpdate = await this.getUser(targetUser, i18n);

    const requestedUser = await this.getUser(reqUser, i18n);
    const isUpdatingSomeoneElse = userToUpdate.id !== requestedUser.id;

    const isNotSuperadmin = requestedUser.role !== UserRoles.superadmin;
    const targetIsSuperadmin = userToUpdate.role === UserRoles.superadmin;

    if (isNotSuperadmin && (isUpdatingSomeoneElse || targetIsSuperadmin)) {
      throw new ForbiddenException(
        i18n?.t(I18nKeys.ERRORS_GENERAL_FORBIDDEN_RESOURCE) ||
          'Forbidden resource',
      );
    }

    const { userId, username } = connectDiscordDto;
    const updateDate = new Date();

    if (userId && username) {
      const connectedUser = await this.userRepository.findUserByProperty(
        UserSearchPath.DiscordUserId,
        userId,
      );

      if (connectedUser) {
        throw new ConflictException(
          i18n?.t(I18nKeys.ERRORS_DISCORD_BOT_ALREADY_CONNECTED) ||
            `Trellify bot is already connected for another discord user`,
        );
      }

      await this.discordService.sendDirectMessage(
        userId,
        i18n?.t(I18nKeys.MESSAGES_GENERAL_CONNECTION_MESSAGE, {
          args: {
            workspacesLink: `<${this.configService.get<string>(configServiceKeys.FRONTEND_LINK)}/workspaces?`,
          },
          lang: userToUpdate.language,
        }) || 'Discord connected successfully',
      );
    } else {
      await this.discordService.sendDirectMessage(
        userToUpdate.discord.userId,
        i18n?.t(I18nKeys.MESSAGES_GENERAL_DISCONNECTION_MESSAGE, {
          lang: userToUpdate.language,
        }) || 'Discord disconnected successfully',
      );
    }

    const updatedUser = await this.userRepository.updateById(userToUpdate.id, {
      discord: { userId, username, updatedAt: updateDate },
      lastActivityDate: updateDate,
    });

    this.logger.log(
      `Discord ${username || userToUpdate.discord?.username} ${userId ? 'connected' : 'disconnected'} by ${
        reqUser
          ? typeof reqUser === 'string'
            ? reqUser
            : reqUser.email
          : 'self'
      }`,
    );

    return {
      message:
        i18n?.t(
          userId
            ? I18nKeys.MESSAGES_DISCORD_CONNECTED_SUCCESSFULLY
            : I18nKeys.MESSAGES_DISCORD_DISCONNECTED_SUCCESSFULLY,
        ) || `Discord ${userId ? 'connected' : 'disconnected'} successfully`,
      statusCode: HttpStatus.OK,
      data: updatedUser,
    };
  }

  public async manageUserTrelloConnection(
    targetUser: string | User,
    reqUser: string | User,
    connectTrelloDto: ConnectTrelloDto,
    i18n?: I18nContext,
  ): Promise<DefaultResponse<User | string>> {
    const userToUpdate = await this.getUser(targetUser, i18n);

    const requestedUser = await this.getUser(reqUser, i18n);
    const isUpdatingSomeoneElse = userToUpdate.id !== requestedUser.id;

    const isNotSuperadmin = requestedUser.role !== UserRoles.superadmin;
    const targetIsSuperadmin = userToUpdate.role === UserRoles.superadmin;

    if (isNotSuperadmin && (isUpdatingSomeoneElse || targetIsSuperadmin)) {
      throw new ForbiddenException(
        i18n?.t(I18nKeys.ERRORS_GENERAL_FORBIDDEN_RESOURCE) ||
          'Forbidden resource',
      );
    }

    const { token } = connectTrelloDto;
    const updateDate = new Date();
    const updatedUserProps: Partial<User> = {
      trello: { ...userToUpdate.trello, updatedAt: updateDate },
      lastActivityDate: updateDate,
    };

    if (!token) {
      await this.trelloWebhooksLogicService.disconnectFromAllTrelloWebhooks(
        userToUpdate,
        i18n,
      );

      updatedUserProps.trello = {
        userId: null,
        username: null,
        webhooks: [],
        token: null,
        updatedAt: updateDate,
      };

      const updatedUser = await this.userRepository.updateById(
        userToUpdate.id,
        updatedUserProps,
      );

      this.logger.log(
        `Trello profile disconnected for user ${userToUpdate.trello.username} by ${
          reqUser
            ? typeof reqUser === 'string'
              ? reqUser
              : reqUser.email
            : 'self'
        }`,
      );

      return {
        message:
          i18n?.t(I18nKeys.MESSAGES_TRELLO_DISCONNECTED_SUCCESSFULLY, {
            args: { username: userToUpdate.trello.username },
          }) ||
          `Trello ${userToUpdate.trello.username} disconnected successfully`,
        statusCode: HttpStatus.OK,
        data: updatedUser,
      };
    }

    if (userToUpdate.trello?.userId && token) {
      throw new ConflictException(
        i18n?.t(I18nKeys.ERRORS_TRELLO_DISCONNECT_FIRST) ||
          `You should disconnect your Trello account first before connecting a new one.`,
      );
    }

    await this.trelloTokensLogicService.isTokenInfinite(token, i18n);

    if (!userToUpdate.trello?.token || userToUpdate.trello.token !== token) {
      updatedUserProps.trello.token = encryptText(token, this.encryptionKey);
    }

    const trelloToken =
      updatedUserProps.trello?.token || userToUpdate.trello.token;

    const trelloProfile =
      await this.trelloMembersLogicService.findMemberProfile(
        userToUpdate,
        trelloToken,
        i18n,
      );

    const connectedUser = await this.userRepository.findUserByProperty(
      UserSearchPath.TrelloUserId,
      trelloProfile.id,
    );

    if (connectedUser) {
      throw new ConflictException(
        i18n?.t(I18nKeys.ERRORS_TRELLO_ALREADY_CONNECTED) ||
          `This trello profile is already binded to other user`,
      );
    }

    updatedUserProps.trello.userId = trelloProfile.id;
    updatedUserProps.trello.username = trelloProfile.username;
    updatedUserProps.trello.webhooks = [];

    // Handle trial plan updates
    if (userToUpdate.subscription.plan === SubscriptionPlans.TRIAL) {
      const usedTrial = await this.usedTrialService.findUserTrialByEmail(
        userToUpdate.email,
      );
      const usedTrialByTrelloId =
        await this.usedTrialService.findUsedTrialByTrelloUserId(
          trelloProfile.id,
        );

      if (usedTrialByTrelloId) {
        if (new Date(usedTrialByTrelloId.trialEnds) < new Date()) {
          throw new ConflictException(
            i18n?.t(I18nKeys.ERRORS_SUBSCRIPTION_TRIAL_EXPIRED) ||
              `This user's trial version has already expired.`,
          );
        }

        await this.usedTrialService.updateUsedTrialById(
          usedTrialByTrelloId.id,
          {
            email: userToUpdate.email,
          },
        );

        if (usedTrial && usedTrial.email !== usedTrialByTrelloId.email) {
          await this.usedTrialService.deleteUserTrialById(usedTrial.id);
        }

        updatedUserProps.subscription = {
          ...userToUpdate.subscription,
          nextPaymentDate: usedTrialByTrelloId.trialEnds,
        };
      }

      if (!usedTrialByTrelloId && usedTrial && !usedTrial.trelloUserId) {
        await this.usedTrialService.updateUsedTrialById(usedTrial.id, {
          trelloUserId: trelloProfile.id,
        });
      }
    }

    const updatedUser = await this.userRepository.updateById(userToUpdate.id, {
      ...updatedUserProps,
    });

    this.logger.log(
      `Trello profile connected for user ${userToUpdate.id} by ${
        reqUser
          ? typeof reqUser === 'string'
            ? reqUser
            : reqUser.email
          : 'self'
      }`,
    );

    return {
      message:
        i18n?.t(I18nKeys.MESSAGES_TRELLO_CONNECTED_SUCCESSFULLY, {
          args: { username: updatedUser.trello.username },
        }) || `Trello ${updatedUser.trello.username} connected successfully`,
      statusCode: HttpStatus.OK,
      data: updatedUser,
    };
  }

  public async removeWebhookFromAllUsers(
    webhook: string | Webhook,
    i18n?: I18nContext,
  ) {
    const webhookToRemove = await this.trelloWebhooksLogicService.getWebhook(
      webhook,
      i18n,
    );

    const usersConnectedToWebhook = await this.findUsersConnectedToWebhook(
      webhookToRemove.id,
    );

    //prepare bulk operation for each user to delete webhook with webhookId
    const bulkUpdateOperations = usersConnectedToWebhook.map((user) => ({
      updateOne: {
        filter: { id: user.id },
        update: {
          $pull: {
            [UserSearchPath.TrelloWebhooks]: {
              webhookId: webhookToRemove.id,
            },
          },
        },
      },
    }));

    const sendTelegramNotification = usersConnectedToWebhook.map((user) => {
      const userLanguage = user.language || Languages.EN;

      this.notificationBotService.sendMessageToUser(
        user.telegram,
        this.i18nService.t(
          I18nKeys.MESSAGES_GENERAL_NOTIFICATIONS_DISCONNECTED,
          {
            lang: userLanguage,
            args: {
              boardName: webhookToRemove.boardName,
              boardUrl: webhookToRemove.boardUrl,
            },
          },
        ) ||
          `Notifications for board [${webhookToRemove.boardName}](${webhookToRemove.boardUrl}) has been disconnected. Please, reconnect notifications`,
        false,
        [
          [
            {
              text:
                this.i18nService.t(I18nKeys.FIELDS_SETTINGS, {
                  lang: userLanguage,
                }) || 'Settings',
              url: `${this.configService.get(configServiceKeys.FRONTEND_LINK)}/workspaces/${webhookToRemove.idWorkspace}`,
            },
          ],
        ],
      );
    });

    try {
      if (bulkUpdateOperations.length > 0) {
        const result = await this.updateManyUsers(bulkUpdateOperations);
        this.logger.log(result);
        await Promise.all(sendTelegramNotification);
      }
    } catch (err) {
      this.logger.error(`Error during bulk update: ${err.message || err}`);
      if (err.name === 'BulkWriteError') {
        this.logger.error(`Bulk write error: ${err.writeErrors}`);
      }
    }
  }

  public async refreshSubscriptionPayment(
    paypalSubscriptionId: string,
  ): Promise<User> {
    const userToRefresh = await this.findUserByProperty(
      UserSearchPath.PaypalSubscriptionId,
      paypalSubscriptionId,
    );

    const sub = userToRefresh?.subscription;

    const correspondingSubscription =
      await this.subscriptionService.findSubscriptionById(sub?.id);

    const paymentCheckResult =
      await this.subscriptionService.checkSubscriptionPayment(
        sub.paypalSubscriptionId,
        userToRefresh,
      );

    const updatedSubscription = {
      ...sub,
      nextPaymentDate:
        paymentCheckResult?.nextPaymentDate || sub.nextPaymentDate,
      expired: !paymentCheckResult,
    };

    if (paymentCheckResult) {
      updatedSubscription.lastPaymentDate = paymentCheckResult.lastPaymentDate;
      updatedSubscription.lastAmount = correspondingSubscription?.price;
      updatedSubscription.totalAmount =
        (sub.totalAmount || 0) + (correspondingSubscription?.price || 0);
    }

    const updatedUser = await this.updateUser(userToRefresh, {
      subscription: updatedSubscription,
    });

    return updatedUser?.data;
  }

  public async refreshSubscriptionStatus(
    paypalSubscriptionId: string,
  ): Promise<User> {
    const userToRefresh = await this.findUserByProperty(
      UserSearchPath.PaypalSubscriptionId,
      paypalSubscriptionId,
    );

    const sub = userToRefresh?.subscription;

    const paypalSubscription =
      await this.paypalLogicService.getSubscriptionInfo(paypalSubscriptionId);

    const status = paypalSubscription?.status;

    let isCancelled = false;
    let isPaused = false;

    switch (status) {
      case 'CANCELLED':
        isCancelled = true;
        break;
      case 'SUSPENDED':
        isPaused = true;
        break;
      case 'ACTIVE':
      default:
        isCancelled = false;
        isPaused = false;
        break;
    }

    // Check if any values actually changed
    const hasChanged =
      sub?.isCancelled !== isCancelled || sub?.isPaused !== isPaused;

    if (!hasChanged) {
      return userToRefresh;
    }

    const updatedSubscription = {
      ...sub,
      isCancelled,
      isPaused,
    };

    const updatedUser = await this.updateUser(userToRefresh, {
      subscription: updatedSubscription,
    });

    return updatedUser.data;
  }

  public async handlePaymentSaleCompleted(
    paypalSubscriptionId: string,
    paymentId: string,
    paymentAmount: number,
    eventDate: string,
  ): Promise<DefaultResponse<User>> {
    const userToRefresh = await this.findUserByProperty(
      UserSearchPath.PaypalSubscriptionId,
      paypalSubscriptionId,
    );

    if (paymentId && userToRefresh?.subscription?.lastPaymentId == paymentId) {
      this.logger.warn(
        `Payment ${paymentId} for user ${userToRefresh?.email} was already processed`,
      );

      return;
    }

    const sub = userToRefresh?.subscription;
    const paymentDate = new Date(eventDate);
    const nextPaymentDate = addDays(paymentDate, 30);

    const correspondingSubscription =
      await this.subscriptionService.findSubscriptionById(sub?.id);

    if (correspondingSubscription?.price !== paymentAmount) {
      this.logger.warn(
        `User ${userToRefresh?.email} paid ${paymentAmount} for subscription plan ${correspondingSubscription?.name}\n` +
          `Current price: ${correspondingSubscription?.price}`,
      );
    }

    const updatedSubscription = {
      ...sub,
      lastPaymentDate: paymentDate,
      nextPaymentDate,
      expired: false,
      paypalSubscriptionId,
      lastPaymentId: paymentId,
      lastAmount: paymentAmount,
      totalAmount: sub.totalAmount + paymentAmount,
    };

    const updatedUser = await this.updateUser(userToRefresh, {
      subscription: updatedSubscription,
    });

    return {
      message: `User monthly plan payment verified successfully`,
      statusCode: HttpStatus.OK,
      data: updatedUser.data,
    };
  }

  public async handleRefundedSubscriptionPayment(
    paymentId: string,
  ): Promise<DefaultResponse<User>> {
    const refundedUser = await this.findUserByProperty(
      UserSearchPath.LastPaymentId,
      paymentId,
    );

    await this.subscriptionService.cancelPaypalSubscription(
      refundedUser?.subscription?.paypalSubscriptionId,
      'Refund requested',
    );

    const updatedSubscription = {
      ...refundedUser?.subscription,
      nextPaymentDate: null,
      expired: true,
      isCancelled: true,
      isPaused: false,
    };

    const updatedUser = await this.updateUser(refundedUser, {
      subscription: updatedSubscription,
    });

    return {
      message: `Subscription expired due to refund`,
      statusCode: HttpStatus.OK,
      data: updatedUser.data,
    };
  }

  public async activateUserSubscription(
    paypalSubscriptionId: string,
    userId: string,
    i18n?: I18nContext,
  ): Promise<DefaultResponse<User>> {
    const subscriber = await this.findUserByProperty(
      UserSearchPath.PaypalSubscriptionId,
      paypalSubscriptionId,
      i18n,
    );

    if (subscriber?.id !== userId) {
      throw new BadRequestException(
        i18n?.t(I18nKeys.ERRORS_GENERAL_FORBIDDEN_RESOURCE) ||
          'You are not allowed to pause somebodys subscription',
      );
    }

    await this.subscriptionService.activatePaypalSubscription(
      paypalSubscriptionId,
      i18n,
    );

    const newUserSubscription = {
      ...subscriber.subscription,
      isPaused: false,
    };

    const updatedUser = await this.updateUser(
      subscriber,
      { subscription: newUserSubscription },
      i18n,
    );

    return {
      message:
        i18n?.t(I18nKeys.MESSAGES_SUBSCRIPTION_REACTIVATED, {
          args: {
            subscription: subscriber?.subscription?.plan,
          },
        }) || 'Subscription reactivated successfully',
      statusCode: HttpStatus.OK,
      data: updatedUser.data,
    };
  }

  public async pauseUserSubscription(
    paypalSubscriptionId: string,
    userId: string,
    reason: string,
    i18n?: I18nContext,
  ): Promise<DefaultResponse<User>> {
    const subscriber = await this.findUserByProperty(
      UserSearchPath.PaypalSubscriptionId,
      paypalSubscriptionId,
      i18n,
    );

    if (subscriber.id !== userId) {
      throw new BadRequestException(
        i18n?.t(I18nKeys.ERRORS_GENERAL_FORBIDDEN_RESOURCE) ||
          'You are not allowed to pause somebodys subscription',
      );
    }

    await this.subscriptionService.pausePaypalSubscription(
      paypalSubscriptionId,
      reason,
      i18n,
    );

    const updatedSubcription = {
      ...subscriber.subscription,
      isPaused: true,
    };

    const updatedUser = await this.updateUser(
      subscriber,
      { subscription: updatedSubcription },
      i18n,
    );

    return {
      message:
        i18n?.t(I18nKeys.MESSAGES_SUBSCRIPTION_PAUSED, {
          args: {
            subscription: subscriber?.subscription?.plan,
          },
        }) || 'Subscription paused successfully',
      statusCode: HttpStatus.OK,
      data: updatedUser.data,
    };
  }

  public async cancelUserSubscription(
    paypalSubscriptionId: string,
    userId: string,
    reason: string,
    i18n?: I18nContext,
  ): Promise<DefaultResponse<User>> {
    const subscriber = await this.findUserByProperty(
      UserSearchPath.PaypalSubscriptionId,
      paypalSubscriptionId,
      i18n,
    );

    if (subscriber.id !== userId) {
      throw new BadRequestException(
        i18n?.t(I18nKeys.ERRORS_GENERAL_FORBIDDEN_RESOURCE) ||
          'You are not allowed to cancel somebodys subscription',
      );
    }

    await this.subscriptionService.cancelPaypalSubscription(
      paypalSubscriptionId,
      reason,
      i18n,
    );

    const updatedSubscription = {
      ...subscriber.subscription,
      isPaused: false,
      isCancelled: true,
    };

    const updatedUser = await this.updateUser(
      subscriber,
      { subscription: updatedSubscription },
      i18n,
    );

    return {
      message:
        i18n?.t(I18nKeys.MESSAGES_SUBSCRIPTION_CANCELLED, {
          args: {
            subscription: subscriber?.subscription?.plan,
          },
        }) || 'Subscription cancelled successfully',
      statusCode: HttpStatus.OK,
      data: updatedUser?.data,
    };
  }

  public async changeSubscriptionPlan(
    user: string | User,
    targetSubscriptionId: string,
    paypalSubscriptionId: string,
    i18n?: I18nContext,
  ): Promise<User> {
    const userToUpdate = await this.getUser(user, i18n);

    const oldSubscription = await this.subscriptionService.getSubscription(
      userToUpdate.subscription.id,
      i18n,
    );

    await this.subscriptionService.removeSubscriberFromPlan(
      oldSubscription,
      userToUpdate,
      i18n,
    );

    const newSubscription = await this.subscriptionService.getSubscription(
      targetSubscriptionId,
      i18n,
    );

    await this.subscriptionService.addSubscriberToPlan(
      newSubscription,
      userToUpdate,
      i18n,
    );

    const updatedUser = await this.updateUser(userToUpdate, {
      subscription: {
        ...userToUpdate.subscription,
        id: newSubscription.id,
        plan: newSubscription.name as SubscriptionPlans,
        expired: false,
        paypalSubscriptionId: paypalSubscriptionId,
        isCancelled: false,
        isPaused: false,
      },
    });

    return updatedUser.data;
  }

  public async contactUs(
    formBody: ContactUsDto,
    i18n?: I18nContext,
  ): Promise<DefaultResponse<null>> {
    const { email, subject, message, authorized } = formBody;
    await this.mailerService.sendContactForm(
      email,
      subject,
      message,
      i18n,
      authorized,
    );

    const notificationMessage =
      await this.adminBotService.actionAdminNotification(
        AdminBotActions.CONTACT_US,
        {
          email,
          subject,
          message,
          authorized,
        },
      );

    await this.adminBotService.notifyAdmins(notificationMessage);

    await this.redisService.updateDailyStats(periodStatsKeys.CONTACT_US, email);
    await this.redisService.updateWeeklyStats(
      periodStatsKeys.CONTACT_US,
      email,
    );

    return {
      message:
        i18n?.t(I18nKeys.MESSAGES_EMAIL_CONTACT_US_EMAIL_SENT_MESSAGE) ||
        `Your message were sent to Trellify team. We will send you a response in 12-48 hours`,
      statusCode: HttpStatus.OK,
    };
  }
}
