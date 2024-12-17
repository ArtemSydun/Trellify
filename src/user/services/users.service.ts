import {
  BadRequestException,
  ConflictException,
  forwardRef,
  HttpStatus,
  Inject,
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { UsersRepository } from '../repositories/users.repository';
import { randomUUID } from 'crypto';
import { User } from '../entities/user.entity';
import { encryptText, hashPassword } from 'src/common/helpers/hashing';
import { MailerService } from 'src/mailer/services/mailer.service';
import { configServiceEnum } from 'src/common/enums/config.service.enum';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { DefaultResponse } from 'src/common/interfaces/responses';
import { TrelloService } from 'src/trello/services/trello.service';
import { UserRoles } from '../interfaces/role.enum';
import { UserSearchPath } from '../interfaces/query.enum';
import { WebhookService } from 'src/trello/services/webhook.service';
import { SharedConfigService } from 'src/trello/services/shared.config.service';
import { ConnectTelegramDto } from '../dto/connect-telegram.dto';
import { TelegramService } from 'src/telegram/telegram.service';
import { ConnectTrelloDto } from '../dto/connect-trello.dto';

@Injectable()
export class UsersService {
  private readonly encryptionKey: string;
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private readonly userRepository: UsersRepository,
    private readonly mailerService: MailerService,
    private readonly configService: ConfigService,
    private readonly sharedConfigService: SharedConfigService,
    private readonly jwtService: JwtService,
    @Inject(forwardRef(() => TrelloService))
    private readonly trelloService: TrelloService,
    @Inject(forwardRef(() => WebhookService))
    private readonly webhookService: WebhookService,
    private readonly telegramService: TelegramService,
  ) {
    this.encryptionKey = this.sharedConfigService.getEncryptionKey();
  }

  public async createUser(createUserDto: CreateUserDto): Promise<User> {
    this.logger.log(`Creating user with email: ${createUserDto.email}`);

    const userByEmail = await this.userRepository.findOneByEmail(createUserDto.email);
    if (userByEmail) {
      this.logger.warn(`User ${createUserDto.email} already exists`);
      throw new ConflictException(`User ${createUserDto.email} already exists`);
    }

    const newUser = {
      id: randomUUID(),
      ...createUserDto,
      password: await hashPassword(createUserDto.password),
    };

    const createdUser = await this.userRepository.create(newUser);
    this.logger.log(`User with email ${createUserDto.email} created successfully`);
    return createdUser;
  }

  public async deleteUserById(userId: string): Promise<DefaultResponse<string>> {
    this.logger.log(`Deleting user with ID: ${userId}`);

    await this.webhookService.disconnectFromAllTrelloWebhooks(userId);
    await this.userRepository.delete(userId);

    this.logger.log(`User ${userId} deleted successfully`);
    return {
      message: `User ${userId} was deleted successfully`,
      statusCode: HttpStatus.OK,
    };
  }

  public async findAll(): Promise<User[]> {
    return await this.userRepository.getAll();
  }

  public async findUserById(id: string): Promise<User> {
    const user = await this.userRepository.findOneById(id);

    if (!user) {
      this.logger.warn(`User with ID ${id} not found`);
      throw new NotFoundException(`User with id ${id} not found`);
    }

    const userWithoutPass = { ...user };
    delete userWithoutPass.password;
    return userWithoutPass;
  }

  async getUser(user: string | User): Promise<User> {
    if (typeof user === 'string') {
      // If it's a string, fetch the user by ID
      return await this.findUserById(user);
    }
    return user; // If it's already a User object, return it as-is
  }

  public async findUserProfile(userId: string): Promise<Partial<User>> {
    const user = await this.userRepository.findOneById(userId);
    if (!user) {
      this.logger.warn(`User with ID ${userId} not found`);
      throw new NotFoundException(`User with id ${userId} not found`);
    }

    const { id, email, role, trello, telegram } = user;

    return {
      id,
      email,
      role,
      trello: { userId: trello.userId, username: trello.username, webhooks: trello.webhooks },
      telegram: { username: telegram.username }
    };
  }

  public async findUserByTrelloId(trelloUserId: string): Promise<User> {
    const userByTrelloId = await this.userRepository.findOneByTrelloId(trelloUserId);
    if (!userByTrelloId) {
      this.logger.warn(`User with Trello ID ${trelloUserId} not found`);
      throw new NotFoundException(`User with Trello ID ${trelloUserId} not found`);
    }

    this.logger.log(`User with Trello ID ${trelloUserId} found`);
    return userByTrelloId;
  }

  public async findUserByEmail(email: string): Promise<User> {
    const user = await this.userRepository.findOneByEmail(email);
    if (!user) {
      this.logger.warn(`User with email ${email} not found`);
      throw new NotFoundException(`User with email ${email} not found`);
    }

    this.logger.log(`User with email ${email} found`);
    return user;
  }

  public async doesUserExist(email: string): Promise<boolean> {
    this.logger.log(`Checking if user exists with email: ${email}`);
    return await this.userRepository.existsByEmail(email);
  }

  public async updateUser(user: string | User, updateUserDto: UpdateUserDto, reqUser?: Partial<User>): Promise<DefaultResponse<User>> {
    if (reqUser?.role !== UserRoles.superadmin) {
      delete updateUserDto.role;
    }

    const userToUpdate = await this.getUser(user);
    const updatedUserProps: Partial<User> = {};

    for (const [key, value] of Object.entries(updateUserDto)) {
      if (key === 'trello' && value) {
        updatedUserProps.trello = { ...userToUpdate.trello, ...value };
        if (value.token) {
          if (!userToUpdate.trello.token || userToUpdate.trello.token !== value.token) {
            updatedUserProps.trello.token = encryptText(value.token, this.encryptionKey);
          } else {
            updatedUserProps.trello.token = userToUpdate.trello.token;
          }
        }

        const trelloToken = updatedUserProps.trello.token || userToUpdate.trello.token;
        const trelloProfile = await this.trelloService.findMemberProfile(userToUpdate, trelloToken);

        updatedUserProps.trello.userId = trelloProfile.id;

        if (value.webhooks) {
          updatedUserProps.trello.webhooks = value.webhooks;
        }
      } else if (key === 'telegram' && value) {
        updatedUserProps.telegram = { ...userToUpdate.telegram, ...value };
      } else if (value !== undefined) {
        updatedUserProps[key] = value;
      }
    }

    const updatedUser = await this.userRepository.updateById(userToUpdate.id, updatedUserProps);
    delete updatedUser.password;

    this.logger.log(`User with ID ${userToUpdate.id} updated successfully`);
    return {
      message: `User ${userToUpdate.id} updated successfully`,
      statusCode: HttpStatus.OK,
      data: updatedUser,
    };
  }

  public async resetPassword(id: string, newPassword: string): Promise<void> {
    const userToReset = await this.getUser(id);
    const encryptedPassword = await hashPassword(newPassword);

    await this.userRepository.updateById(userToReset.id, { password: encryptedPassword });
    this.logger.log(`Password for user with ID ${id} reset successfully`);
  }

  public async initiateUserRegistration(createUserDto: CreateUserDto): Promise<DefaultResponse<null>> {
    this.logger.log(`Initiating user registration for email: ${createUserDto.email}`);

    const userByEmail = await this.userRepository.findOneByEmail(createUserDto.email);
    if (userByEmail) {
      this.logger.warn(`User ${createUserDto.email} already exists`);
      throw new ConflictException(`User ${createUserDto.email} already exists`);
    }

    const payload = {
      email: createUserDto.email,
      password: createUserDto.password,
      telegram: { username: null, chatId: null },
      trello: { userId: null, token: null, webhooks: [] },
    };

    const token = this.jwtService.sign(payload, { expiresIn: '1d' });

    const confirmationLink = this.mailerService.getLink(
      this.configService.get(configServiceEnum.FRONTEND_LINK),
      `auth/confirm/${token}`,
      'Confirm your email',
    );

    await this.mailerService.sendDistribution(
      this.configService.get(configServiceEnum.MAILER_SENDER),
      createUserDto.email,
      {
        subject: 'Confirm Your Email',
        html: `<p>Please confirm your email by clicking the following link: ${confirmationLink}</p>`,
      },
    );

    this.logger.log(`Confirmation link sent to ${createUserDto.email}`);
    return {
      message: `Confirmation link sent to your email ${createUserDto.email}`,
      statusCode: HttpStatus.OK,
    };
  }

  public async findUsersConnectedToWebhook(webhookId: string): Promise<User[]> {
    this.logger.log(`Finding users connected to webhook ID: ${webhookId}`);
    return this.userRepository.findUsersConnectedToWebhook(webhookId);
  }

  public async findUserByProperty(path: UserSearchPath, value: any): Promise<User> {
    const user = await this.userRepository.findUserByProperty(path, value);
    if (!user) {
      this.logger.warn(`User with property ${path}: ${value} not found`);
      throw new NotFoundException(`User with property ${path}: ${value} not found`);
    }

    this.logger.log(`User with property ${path}: ${value} found`);
    delete user.password;
    return user;
  }

  public async manageUserTelegramConnection(userId: string, connectTelegramDto: ConnectTelegramDto): Promise<DefaultResponse<User>> {
    const userToUpdate = await this.getUser(userId);
    const { chatId, username } = connectTelegramDto;

    try {
      if (chatId && username) {
        await this.telegramService.sendMessageToUser(connectTelegramDto, `Trello notifier bot authorized successfully`);
      } else {
        await this.telegramService.sendMessageToUser(userToUpdate.telegram, `Trello notifier bot disconnected successfully`);
      }
    } catch (err) {
      this.logger.error(`Error sending Telegram message: ${err.message}`);
      throw new BadRequestException(`This Telegram user has not interacted with bot yet`);
    }

    const updatedUser = await this.userRepository.updateById(userToUpdate.id, {
      telegram: { chatId, username },
    });

    this.logger.log(`Telegram ${username} ${chatId ? 'connected' : 'disconnected'} successfully`);
    return {
      message: `Telegram ${username} ${chatId ? 'connected' : 'disconnected'} successfully`,
      statusCode: HttpStatus.OK,
      data: updatedUser,
    };
  }

  public async manageUserTrelloConnection(userId: string, connectTrelloDto: ConnectTrelloDto): Promise<DefaultResponse<User | string>> {
    const userToUpdate = await this.getUser(userId);
    const { token } = connectTrelloDto;

    if (!token) {
      await this.webhookService.disconnectFromAllTrelloWebhooks(userToUpdate);
      const updatedUser = await this.userRepository.updateById(userToUpdate.id, {
        trello: { userId: null, username: null, webhooks: [], token: null },
      });

      this.logger.log(`Trello profile disconnected for user ${userId}`);
      return {
        message: `Trello profile disconnected successfully`,
        statusCode: HttpStatus.OK,
        data: updatedUser,
      };
    }

    await this.trelloService.isTokenInfinite(token);

    const updatedUserProps: Partial<User> = { trello: { ...userToUpdate.trello } };

    if (!userToUpdate.trello.token || userToUpdate.trello.token !== token) {
      updatedUserProps.trello.token = encryptText(token, this.encryptionKey);
    } else {
      updatedUserProps.trello.token = userToUpdate.trello.token;
    }

    const trelloToken = updatedUserProps.trello.token || userToUpdate.trello.token;
    const trelloProfile = await this.trelloService.findMemberProfile(userId, trelloToken);

    updatedUserProps.trello.userId = trelloProfile.id;
    updatedUserProps.trello.username = trelloProfile.username;

    const updatedUser = await this.userRepository.updateById(userToUpdate.id, updatedUserProps);

    this.logger.log(`Trello profile connected for user ${userId}`);
    return {
      message: `Trello ${userId} connected successfully`,
      statusCode: HttpStatus.OK,
      data: updatedUser,
    };
  }

  public async removeWebhookFromAllUsers(webhookId: string) {
    const usersConnectedToWebhook = await this.findUsersConnectedToWebhook(webhookId);
    const bulkUpdateOperations = usersConnectedToWebhook.map(user => ({
      updateOne: {
        filter: { id: user.id },
        update: {
          $pull: { 'trello.webhooks': webhookId },
        },
      },
    }));

    try {
      if (bulkUpdateOperations.length > 0) {
        const result = await this.userRepository.bulkUpdateUsers(bulkUpdateOperations);
        this.logger.log(result);
      }
    } catch (err) {
      this.logger.error(`Error during bulk update: ${err.message || err}`);
      if (err.name === 'BulkWriteError') {
        this.logger.error(`Bulk write error: ${err.writeErrors}`);
      }
    }
  }
}
