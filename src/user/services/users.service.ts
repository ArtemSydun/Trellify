import {
  ConflictException,
  forwardRef,
  HttpStatus,
  Inject,
  Injectable,
  NotFoundException,
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

@Injectable()
export class UsersService {
  private readonly encryptionKey: string;
  constructor(private readonly userRepository: UsersRepository,
    private readonly mailerService: MailerService,
    private readonly configService: ConfigService,
    private readonly sharedConfigService: SharedConfigService,
    private readonly jwtService: JwtService,
    @Inject(forwardRef(() => TrelloService))
    private readonly trelloService: TrelloService,
    @Inject(forwardRef(() => WebhookService))
    private readonly webhookService: WebhookService,
  ) {
    this.encryptionKey = this.sharedConfigService.getEncryptionKey();
  }

  public async createUser(createUserDto: CreateUserDto): Promise<User> {
    const userByEmail = await this.userRepository.findOneByEmail(
      createUserDto.email,
    );

    if (userByEmail) {
      throw new ConflictException(`User ${createUserDto.email} already exist`);
    }

    const newUser = {
      id: randomUUID(),
      ...createUserDto,
      password: await hashPassword(createUserDto.password),
    };

    return await this.userRepository.create(newUser);
  }

  public async deleteUserById(userId: string): Promise<DefaultResponse<string>> {
    await this.webhookService.disconnectFromAllTrelloWebhooks(userId);

    await this.userRepository.delete(userId);

    return {
      message: `User ${userId} was delete successfully`,
      statusCode: HttpStatus.OK,
    }
  }

  public async findAll(): Promise<User[]> {
    return await this.userRepository.getAll();
  }

  public async findUserById(id: string): Promise<User> {
    const user = await this.userRepository.findOneById(id);

    if (!user) throw new NotFoundException(`User with id ${id} not found`);

    const userWithoutPass = {
      ...user,
    }

    delete userWithoutPass.password

    return userWithoutPass;
  }

  public async findUserProfile(userId: string): Promise<Partial<User>> {
    const user = await this.userRepository.findOneById(userId);

    if (!user) throw new NotFoundException(`User with id ${userId} not found`);

    const { id, email, role, trello } = user;

    return {
      id, email, role, trello: {
        userId: trello.userId || ''
      }
    };
  }

  public async findUserByTrelloId(trelloUserId: string): Promise<User> {
    const userByTrelloId = await this.userRepository.findOneByTrelloId(trelloUserId);

    if (!userByTrelloId) throw new NotFoundException(`User with TrelloId ${trelloUserId} not found`);

    return userByTrelloId;
  }

  public async findUserByEmail(email: string): Promise<User> {
    const user = await this.userRepository.findOneByEmail(email);

    if (!user)
      throw new NotFoundException(`User with email ${email} not found`);

    return user;
  }

  public async doesUserExist(email: string): Promise<boolean> {
    return await this.userRepository.existsByEmail(email);
  }

  public async updateUserById(id: string, updateUserDto: UpdateUserDto, reqUser?: Partial<User>): Promise<DefaultResponse<User>> {
    if (reqUser?.role !== UserRoles.superadmin) {
      delete updateUserDto.role;
    }

    const userToUpdate = await this.findUserById(id);

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
        const trelloProfile = await this.trelloService.findMemberProfile(id, trelloToken);

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

    const updatedUser = await this.userRepository.updateById(id, updatedUserProps);

    delete updatedUser.password;

    return {
      message: `User ${id} updated successfully`,
      statusCode: HttpStatus.OK,
      data: updatedUser,
    };
  }

  public async resetPassword(id: string, newPassword: string): Promise<void> {
    const userToReset = await this.findUserById(id);

    const encryptedPassword = await hashPassword(newPassword);

    await this.userRepository.updateById(userToReset.id, {
      password: encryptedPassword,
    });
  }

  public async initiateUserRegistration(
    createUserDto: CreateUserDto,
  ): Promise<DefaultResponse<null>> {
    const userByEmail = await this.userRepository.findOneByEmail(
      createUserDto.email,
    );
    if (userByEmail) {
      throw new ConflictException(`User ${createUserDto.email} already exist`);
    }
    const payload = {
      email: createUserDto.email,
      password: createUserDto.password,
      telegram: {
        username: null,
        chatId: null,
      },
      trello: {
        userId: null,
        token: null,
        webhooks: []
      }
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

    return {
      message: `Confirmation link sent to your email ${createUserDto.email}`,
      statusCode: HttpStatus.OK,
    };
  }

  public async findUsersConnectedToWebhook(webhookId: string): Promise<User[]> {
    return this.userRepository.findUsersConnectedToWebhook(webhookId);
  }

  public async findUserByProperty(path: UserSearchPath, value: any): Promise<User> {
    const user = await this.userRepository.findUserByNestedProperty(path, value);

    if (!user) {
      throw new NotFoundException(`User with property ${path}: ${value} not found`);
    }

    delete user.password;

    return user;
  }

  public async connectUserTelegram(userId: string, chatId: number, username: string): Promise<DefaultResponse<User>> {
    const userToUpdate = await this.findUserById(userId);

    const updatedUser = await this.userRepository.updateById(userToUpdate.id, {
      telegram: {
        chatId,
        username,
      }
    })

    return {
      message: `Telegram ${username} connected successfully`,
      statusCode: HttpStatus.OK,
      data: updatedUser
    }
  }

  public async removeWebhookFromAllUsers(webhookId: string) {
    const usersConnectedToWebhook = await this.findUsersConnectedToWebhook(webhookId);

    const bulkUpdateOperations = usersConnectedToWebhook.map(user => {
      return {
        updateOne: {
          filter: { id: user.id },
          update: {
            $pull: {
              'trello.webhooks': webhookId,
            },
          },
        },
      };
    });

    try {
      if (bulkUpdateOperations.length > 0) {
        const result = await this.userRepository.bulkUpdateUsers(bulkUpdateOperations);
        console.log('Bulk update result:', result);
      }
    } catch (err) {
      console.error('Error during bulk update:', err.message || err);

      if (err.name === 'BulkWriteError') {
        console.error('Bulk write error:', err.writeErrors);
      }
    }
  }
}
