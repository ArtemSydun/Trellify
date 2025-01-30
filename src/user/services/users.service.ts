import { randomUUID } from 'crypto';
import {
  ConflictException,
  HttpStatus,
  Injectable,
  NotFoundException,
  Logger,
  ForbiddenException,
} from '@nestjs/common';
import {
  TrelloMembersLogicService,
  TrelloTokensLogicService,
  TrelloWebhooksLogicService,
} from '@trello/logic';
import { I18nContext } from 'nestjs-i18n';
import { I18nKeys } from 'src/common/enums/i18n-keys.enum';
import { Languages } from 'src/common/enums/languages.enum';
import {
  decryptText,
  encryptText,
  hashPassword,
} from 'src/common/helpers/hashing';
import { DefaultResponse } from 'src/common/interfaces/responses';
import { SharedConfigService } from 'src/config/shared.config.service';
import { TelegramService } from 'src/telegram/telegram.service';

import { Webhook } from 'src/trello/entities/webhook.entity';
import { ConnectTelegramDto } from '../dto/connect-telegram.dto';
import { ConnectTrelloDto } from '../dto/connect-trello.dto';
import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserLanguageDto } from '../dto/update-user-language.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { User } from '../entities/user.entity';
import { UserSearchPathEnum } from '../enums/query.enum';
import { UserRoles } from '../enums/role.enum';
import { UsersRepository } from '../repositories/users.repository';

@Injectable()
export class UsersService {
  private readonly encryptionKey: string;
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private readonly userRepository: UsersRepository,
    private readonly sharedConfigService: SharedConfigService,
    private readonly trelloMembersLogicService: TrelloMembersLogicService,
    private readonly trelloTokensLogicService: TrelloTokensLogicService,
    private readonly trelloWebhooksLogicService: TrelloWebhooksLogicService,
    private readonly telegramService: TelegramService,
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

    const newUser = {
      id: randomUUID(),
      ...createUserDto,
      password: await hashPassword(createUserDto.password),
    };

    const createdUser = await this.userRepository.create(newUser);
    this.logger.log(
      `User with email ${createUserDto.email} created successfully`,
    );
    return createdUser;
  }

  public async deleteUserById(
    requestedAuthor: string | User,
    userToDelete: string | User,
    i18n?: I18nContext,
  ): Promise<DefaultResponse<string>> {
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
        await this.trelloWebhooksLogicService.findMemberCreatedWebhooks(
          targetUser,
          i18n,
        );

      const notificationPromises = authorWebhooks.map(async (webhook) => {
        webhook.subscribers.map(async (subscriber) => {
          const subscriberToNotify = await this.findUserByTrelloId(
            subscriber.trelloUserId,
          );

          this.telegramService.sendMessageToUser(
            subscriberToNotify.telegram,
            i18n?.t(I18nKeys.MESSAGES_TELEGRAM_NOTIFICATIONS_DISCONNECTED, {
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

  public async findAll(): Promise<User[]> {
    return await this.userRepository.getAll();
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

  public async findUserProfile(
    user: string | User,
    i18n?: I18nContext,
  ): Promise<Partial<User>> {
    const userToFind = await this.getUser(user);
    if (!user) {
      this.logger.warn(`User with ID ${userToFind.id} not found`);
      throw new NotFoundException(
        i18n?.t(I18nKeys.ERRORS_USER_NOT_FOUND_BY_ID, {
          args: { id: userToFind.id },
        }) || `User with id ${userToFind.id} not found`,
      );
    }

    delete userToFind.password;
    delete userToFind.telegram.chatId;
    delete userToFind.trello.token;

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

    this.logger.log(`User with Trello ID ${trelloUserId} found`);
    return userByTrelloId;
  }

  public async findUsersByTrelloIds(trelloUserIds: string[]): Promise<User[]> {
    const usersByTrelloId =
      await this.userRepository.findManyByTrelloIds(trelloUserIds);

    return usersByTrelloId;
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

    this.logger.log(`User with email ${email} found`);
    return user;
  }

  public async doesUserExist(email: string): Promise<boolean> {
    this.logger.log(`Checking if user exists with email: ${email}`);
    return await this.userRepository.existsByEmail(email);
  }

  public async updateUser(
    user: string | User,
    updateUserDto: UpdateUserDto,
    i18n?: I18nContext,
    reqUser?: Partial<User>,
  ): Promise<DefaultResponse<User>> {
    if (reqUser?.role !== UserRoles.superadmin) {
      delete updateUserDto.role;
    }

    const userToUpdate = await this.getUser(user, i18n);
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

    this.logger.log(`User with ID ${userToUpdate.id} updated successfully`);
    return {
      message: `User ${userToUpdate.id} updated successfully`,
      statusCode: HttpStatus.OK,
      data: updatedUser,
    };
  }

  public async updateUserLanguagePreference(
    user: string | User,
    updateUserLanguageDto: UpdateUserLanguageDto,
    i18n?: I18nContext,
  ) {
    const userToUpdate = await this.getUser(user, i18n);

    const updatedUser = await this.userRepository.updateById(userToUpdate.id, {
      language: updateUserLanguageDto.language,
    });

    return {
      message: `User ${userToUpdate.id} language preference updated successfully`,
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

    await this.userRepository.updateById(userToReset.id, {
      password: encryptedPassword,
    });
    this.logger.log(`Password for user with ID ${id} reset successfully`);
  }

  public async findUsersConnectedToWebhook(webhookId: string): Promise<User[]> {
    this.logger.log(`Finding users connected to webhook ID: ${webhookId}`);
    return this.userRepository.findUsersConnectedToWebhook(webhookId);
  }

  public async findUserByProperty(
    path: UserSearchPathEnum,
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

  public async manageUserTelegramConnection(
    user: string | User,
    connectTelegramDto: ConnectTelegramDto,
    i18n?: I18nContext,
  ): Promise<DefaultResponse<User>> {
    const userToUpdate = await this.getUser(user, i18n);
    const { chatId, username } = connectTelegramDto;

    if (chatId && username) {
      const connectedUser = await this.userRepository.findUserByProperty(
        UserSearchPathEnum.TelegramChatId,
        chatId,
      );

      if (connectedUser && connectedUser.id !== userToUpdate.id) {
        throw new ConflictException(
          i18n?.t(I18nKeys.ERRORS_TELEGRAM_BOT_ALREADY_CONNECTED) ||
            `Trellify bot is already connected for another telegram user`,
        );
      }

      await this.telegramService.sendMessageToUser(
        connectTelegramDto,
        i18n?.t(I18nKeys.MESSAGES_TELEGRAM_CONNECTION_MESSAGE) ||
          `Trellify authorized successfully`,
      );
    } else {
      await this.telegramService.sendMessageToUser(
        userToUpdate.telegram,
        i18n?.t(I18nKeys.MESSAGES_TELEGRAM_DISCONNECTION_MESSAGE) ||
          `Trello notifier bot disconnected successfully`,
      );
    }

    const updatedUser = await this.userRepository.updateById(userToUpdate.id, {
      telegram: { chatId, username, updatedAt: new Date() },
    });

    this.logger.log(
      `Telegram ${username} ${chatId ? 'connected' : 'disconnected'} successfully`,
    );
    return {
      message: `Telegram ${username || userToUpdate.telegram.username} ${chatId ? 'connected' : 'disconnected'} successfully`,
      statusCode: HttpStatus.OK,
      data: updatedUser,
    };
  }

  public async manageUserTrelloConnection(
    user: string | User,
    connectTrelloDto: ConnectTrelloDto,
    i18n?: I18nContext,
  ): Promise<DefaultResponse<User | string>> {
    const userToUpdate = await this.getUser(user, i18n);
    const { token } = connectTrelloDto;

    if (!token) {
      await this.trelloWebhooksLogicService.disconnectFromAllTrelloWebhooks(
        userToUpdate,
        i18n,
      );
      const updatedUser = await this.userRepository.updateById(
        userToUpdate.id,
        {
          trello: { userId: null, username: null, webhooks: [], token: null },
        },
      );

      this.logger.log(`Trello profile disconnected for user ${user}`);
      return {
        message: `Trello ${userToUpdate.trello.username} disconnected successfully`,
        statusCode: HttpStatus.OK,
        data: updatedUser,
      };
    }

    await this.trelloTokensLogicService.isTokenInfinite(token, i18n);

    const updatedUserProps: Partial<User> = {
      trello: { ...userToUpdate.trello },
    };

    if (!userToUpdate.trello.token || userToUpdate.trello.token !== token) {
      updatedUserProps.trello.token = encryptText(token, this.encryptionKey);
    } else {
      updatedUserProps.trello.token = userToUpdate.trello.token;
    }

    const trelloToken =
      updatedUserProps.trello.token || userToUpdate.trello.token;

    const trelloProfile =
      await this.trelloMembersLogicService.findMemberProfile(
        userToUpdate,
        trelloToken,
        i18n,
      );

    const connectedUser = await this.userRepository.findUserByProperty(
      UserSearchPathEnum.TrelloUserId,
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

    const updatedUser = await this.userRepository.updateById(
      userToUpdate.id,
      updatedUserProps,
    );

    this.logger.log(`Trello profile connected for user ${userToUpdate.id}`);
    return {
      message: `Trello ${updatedUser.trello.username} connected successfully`,
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
            [UserSearchPathEnum.TrelloWebhooks]: {
              webhookId: webhookToRemove.id,
            },
          },
        },
      },
    }));

    const sendTelegramNotification = usersConnectedToWebhook.map((user) => {
      const userLanguage = user.language || Languages.EN;

      this.telegramService.sendMessageToUser(
        user.telegram,
        i18n?.t(I18nKeys.MESSAGES_TELEGRAM_NOTIFICATIONS_DISCONNECTED, {
          lang: userLanguage,
          args: {
            boardName: webhookToRemove.boardName,
            boardUrl: webhookToRemove.boardUrl,
          },
        }) ||
          `Notifications for board [${webhookToRemove.boardName}](${webhookToRemove.boardUrl}) has been disconnected. Please, reconnect notifications`,
      );
    });

    try {
      if (bulkUpdateOperations.length > 0) {
        const result =
          await this.userRepository.bulkUpdateUsers(bulkUpdateOperations);
        this.logger.log(result);
        Promise.all([sendTelegramNotification]);
      }
    } catch (err) {
      this.logger.error(`Error during bulk update: ${err.message || err}`);
      if (err.name === 'BulkWriteError') {
        this.logger.error(`Bulk write error: ${err.writeErrors}`);
      }
    }
  }
}
