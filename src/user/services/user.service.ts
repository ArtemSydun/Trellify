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
import { UserRepository } from '../repositories/user.repository';
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

@Injectable()
export class UserService {
  private readonly encryptionKey: string;
  constructor(private readonly userRepository: UserRepository,
    private readonly mailerService: MailerService,
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
    @Inject(forwardRef(() => TrelloService))
    private readonly trelloService: TrelloService,
  ) {
    this.encryptionKey = this.configService.get(configServiceEnum.ENCRYPTION_KEY) || '';
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

  public async findAll(): Promise<User[]> {
    return await this.userRepository.getAll();
  }

  public async findUserById(id: string): Promise<User> {
    const user = await this.userRepository.findOneById(id);

    if (!user) throw new NotFoundException(`User with id ${id} not found`);

    return user;
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

  public async updateUserById(userId: string, updateUserDto: UpdateUserDto, reqUser?: Partial<User>): Promise<DefaultResponse<User>> {
    if (reqUser?.role !== UserRoles.admin) {
      delete updateUserDto.role;
    }

    const userToUpdate = await this.findUserById(userId);

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
        const trelloProfile = await this.trelloService.findMemberProfile(userId, trelloToken);

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

    const updatedUser = await this.userRepository.updateById(userId, updatedUserProps);

    return {
      message: `User ${userId} updated successfully`,
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
      this.configService.get(configServiceEnum.BACKEND_LINK),
      `auth/confirm?token=${token}`,
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
}
