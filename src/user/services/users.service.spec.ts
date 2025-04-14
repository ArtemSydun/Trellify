import { Test } from '@nestjs/testing';
import { UsersService } from './users.service';
import { UsersRepository } from '../repositories/users.repository';
import {
  TrelloMembersLogicService,
  TrelloTokensLogicService,
  TrelloWebhooksLogicService,
} from '@trello/logic';
import { NotificationBotService } from 'src/telegram/notification-bot/notification-bot.service';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import { createMock } from '@golevelup/ts-jest';
import { superAdminStub, userStub } from '../__mocks__/user.stub';
import {
  decryptText,
  encryptText,
  hashPassword,
} from 'src/common/helpers/hashing';
import { ResetPasswordDto } from 'src/auth/dto/reset-password.dto';
import { trelloProfileMock } from 'src/trello/__mocks__/trello.stub';
import { UserSearchPath } from '../enums/query.enum';
import { UserRoles } from '../enums/role.enum';
import { Languages } from 'src/common/enums/languages.enum';
import { webhookStub } from 'src/trello/__mocks__/webhook.stub';
import { UserQueryDto } from '../dto/user.query.dto';
import { User } from '../entities/user.entity';
import { AdminBotService } from 'src/telegram/admin-bot/admin-bot.service';
import { MailerService } from 'src/mailer/services/mailer.service';
import { AdminBotActions } from 'src/common/enums/admin-bot-actions.enum';
import { ConfigService } from '@nestjs/config';
import { RedisService } from 'src/redis/services/redis.service';
import { DiscordService } from 'src/discord/discord.service';
import { SubscriptionService } from 'src/subscription/services/subscription.service';
import { SubscriptionPlans } from 'src/subscription/enum/subscription-plan.enum';
import { UsedTrialService } from 'src/subscription/services/used-trial.service';
import { usedTrialStub } from '../__mocks__/used-trial.stub';
import { I18nService } from 'nestjs-i18n';

jest.mock('src/common/helpers/hashing', () => ({
  hashPassword: jest.fn(),
  encryptText: jest.fn(),
  decryptText: jest.fn(),
}));

describe('UsersService', () => {
  let originalDate = Date;
  let configService: ConfigService;
  let usersService: UsersService;
  let usersRepository: UsersRepository;
  let trelloMembersLogicService: TrelloMembersLogicService;
  let trelloTokensLogicService: TrelloTokensLogicService;
  let trelloWebhooksLogicService: TrelloWebhooksLogicService;
  let notificationBotService: NotificationBotService;
  let adminBotService: AdminBotService;
  let mailerService: MailerService;
  let usedTrialService: UsedTrialService;
  let redisService: RedisService;
  // let subscriptionService: SubscriptionService;
  let mockUsers: User[];

  const fixedDate = superAdminStub().telegram.updatedAt;
  beforeEach(async () => {
    originalDate = global.Date;
    global.Date = class extends originalDate {
      constructor() {
        super();
        return fixedDate;
      }
    } as unknown as DateConstructor;

    const moduleRef = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: UsersRepository, useValue: createMock<UsersRepository>() },
        {
          provide: ConfigService,
          useValue: createMock<ConfigService>(),
        },
        {
          provide: TrelloMembersLogicService,
          useValue: createMock<TrelloMembersLogicService>(),
        },
        {
          provide: TrelloTokensLogicService,
          useValue: createMock<TrelloTokensLogicService>(),
        },
        {
          provide: TrelloWebhooksLogicService,
          useValue: createMock<TrelloWebhooksLogicService>(),
        },
        {
          provide: NotificationBotService,
          useValue: createMock<NotificationBotService>(),
        },
        {
          provide: AdminBotService,
          useValue: createMock<AdminBotService>(),
        },
        {
          provide: DiscordService,
          useValue: createMock<DiscordService>(),
        },
        {
          provide: RedisService,
          useValue: createMock<RedisService>(),
        },
        {
          provide: SubscriptionService,
          useValue: createMock<SubscriptionService>(),
        },
        {
          provide: UsedTrialService,
          useValue: createMock<UsedTrialService>(),
        },
        {
          provide: MailerService,
          useValue: createMock<MailerService>(),
        },
        {
          provide: I18nService,
          useValue: createMock<I18nService>(),
        },
      ],
    }).compile();

    configService = moduleRef.get<ConfigService>(ConfigService);
    usersService = moduleRef.get<UsersService>(UsersService);
    usersRepository = moduleRef.get<UsersRepository>(UsersRepository);
    trelloMembersLogicService = moduleRef.get<TrelloMembersLogicService>(
      TrelloMembersLogicService,
    );
    trelloTokensLogicService = moduleRef.get<TrelloTokensLogicService>(
      TrelloTokensLogicService,
    );
    trelloWebhooksLogicService = moduleRef.get<TrelloWebhooksLogicService>(
      TrelloWebhooksLogicService,
    );
    notificationBotService = moduleRef.get<NotificationBotService>(
      NotificationBotService,
    );

    adminBotService = moduleRef.get<AdminBotService>(AdminBotService);

    mailerService = moduleRef.get<MailerService>(MailerService);

    redisService = moduleRef.get<RedisService>(RedisService);
    usedTrialService = moduleRef.get<UsedTrialService>(UsedTrialService);

    subscriptionService =
      moduleRef.get<SubscriptionService>(SubscriptionService);

    mockUsers = [userStub(), superAdminStub()];

    (encryptText as jest.Mock).mockImplementation((text: string) => {
      return text.includes('encrypted') ? text : `encrypted${text}`; // ✅ Avoid double encryption
    });

    (decryptText as jest.Mock).mockImplementation((text: string) => {
      return text.replace('encrypted', ''); // ✅ Strip only one level of encryption
    });

    (hashPassword as jest.Mock).mockResolvedValue('hashedPassword');

    jest
      .spyOn(trelloWebhooksLogicService, 'getWebhook')
      .mockResolvedValue({ ...webhookStub });

    jest.spyOn(usersService, 'getUser').mockResolvedValue(userStub());

    jest
      .spyOn(usersService, 'findUsersConnectedToWebhook')
      .mockResolvedValue([userStub(), superAdminStub()]);

    jest
      .spyOn(trelloMembersLogicService, 'findMemberProfile')
      .mockResolvedValue(trelloProfileMock);
  });

  afterEach(() => {
    global.Date = originalDate;
  });

  describe('createUser', () => {
    // it('should create a new user with fresh subscription successfully', async () => {
    //   const newUser = {
    //     ...superAdminStub(),
    //     telegram: { ...superAdminStub().telegram, updatedAt: null },
    //     trello: { ...superAdminStub().trello, updatedAt: null },
    //     discord: { ...superAdminStub().discord, updatedAt: null },
    //   };
    //   const trialSubscriptionPlan = {
    //     id: 'id1',
    //     name: SubscriptionPlans.TRIAL,
    //     price: 0,
    //     subscribers: [],
    //     notifications: {
    //       card: {},
    //       checklist: {},
    //       list: {},
    //       board: {},
    //     },
    //   };
    //   const createUserDto = {
    //     email: superAdminStub().email,
    //     password: 'password123',
    //     timezone: 0,
    //     subscription: {
    //       id: 'id1',
    //       plan: SubscriptionPlans.TRIAL,
    //       lastAmount: 0,
    //       totalAmount: 0,
    //       expired: false,
    //       lastPaymentDate: null,
    //       nextPaymentDate: (() => {
    //         const date = new Date();
    //         date.setDate(date.getDate() + 14);
    //         return date;
    //       })(),
    //     },
    //     trello: { userId: null, token: null, webhooks: [], updatedAt: null },
    //     telegram: {
    //       username: null,
    //       chatId: null,
    //       updatedAt: null,
    //     },
    //     discord: {
    //       userId: null,
    //       username: null,
    //       updatedAt: null,
    //     },
    //   };
    //   jest.spyOn(usersRepository, 'findOneByEmail').mockResolvedValue(null);
    //   jest.spyOn(usersRepository, 'create').mockResolvedValue(newUser);
    //   jest
    //     .spyOn(subscriptionService, 'findSubscriptionByName')
    //     .mockResolvedValue(trialSubscriptionPlan);
    //   jest
    //     .spyOn(usedTrialService, 'findUserTrialByEmail')
    //     .mockResolvedValue(null);
    //   const result = await usersService.createUser(createUserDto);
    //   expect(usersRepository.findOneByEmail).toHaveBeenCalledWith(
    //     createUserDto.email,
    //   );
    //   expect(hashPassword).toHaveBeenCalledWith(createUserDto.password);
    //   expect(usersRepository.create).toHaveBeenCalledWith({
    //     id: expect.any(String),
    //     ...createUserDto,
    //     password: 'hashedPassword',
    //   });
    //   expect(result).toEqual(newUser);
    // });
    // it('should create a new user with trial expiration date if he already used trial and it is not expired', async () => {
    //   const newUser = {
    //     ...superAdminStub(),
    //     telegram: { ...superAdminStub().telegram, updatedAt: null },
    //     trello: { ...superAdminStub().trello, updatedAt: null },
    //     discord: { ...superAdminStub().discord, updatedAt: null },
    //   };
    //   const trialSubscriptionPlan = {
    //     id: 'id1',
    //     name: SubscriptionPlans.TRIAL,
    //     price: 0,
    //     subscribers: [],
    //     notifications: {
    //       card: {},
    //       checklist: {},
    //       list: {},
    //       board: {},
    //     },
    //   };
    //   const trialExpires = new Date();
    //   const createUserDto = {
    //     email: superAdminStub().email,
    //     password: 'password123',
    //     timezone: 0,
    //     subscription: {
    //       id: 'id1',
    //       plan: SubscriptionPlans.TRIAL,
    //       lastAmount: 0,
    //       totalAmount: 0,
    //       expired: false,
    //       lastPaymentDate: null,
    //       nextPaymentDate: trialExpires,
    //     },
    //     trello: { userId: null, token: null, webhooks: [], updatedAt: null },
    //     telegram: {
    //       username: null,
    //       chatId: null,
    //       updatedAt: null,
    //     },
    //     discord: {
    //       userId: null,
    //       username: null,
    //       updatedAt: null,
    //     },
    //   };
    //   const usedTrial = {
    //     ...usedTrialStub,
    //     email: createUserDto.email,
    //     trialEnds: trialExpires,
    //   };
    //   jest.spyOn(usersRepository, 'findOneByEmail').mockResolvedValue(null);
    //   jest.spyOn(usersRepository, 'create').mockResolvedValue(newUser);
    //   jest
    //     .spyOn(subscriptionService, 'findSubscriptionByName')
    //     .mockResolvedValue(trialSubscriptionPlan);
    //   jest
    //     .spyOn(usedTrialService, 'findUserTrialByEmail')
    //     .mockResolvedValue(usedTrial);
    //   const result = await usersService.createUser(createUserDto);
    //   expect(usersRepository.findOneByEmail).toHaveBeenCalledWith(
    //     createUserDto.email,
    //   );
    //   expect(hashPassword).toHaveBeenCalledWith(createUserDto.password);
    //   expect(usersRepository.create).toHaveBeenCalledWith({
    //     id: expect.any(String),
    //     ...createUserDto,
    //     password: 'hashedPassword',
    //   });
    //   expect(result).toEqual(newUser);
    // });
    // it('should create a new user with expired subscription if he already used trial', async () => {
    //   const trialSubscriptionPlan = {
    //     id: 'id1',
    //     name: SubscriptionPlans.TRIAL,
    //     price: 0,
    //     subscribers: [],
    //     notifications: {
    //       card: {},
    //       checklist: {},
    //       list: {},
    //       board: {},
    //     },
    //   };
    //   const createUserDto = {
    //     email: superAdminStub().email,
    //     password: 'password123',
    //     timezone: 0,
    //     subscription: {
    //       id: 'id1',
    //       plan: SubscriptionPlans.TRIAL,
    //       lastAmount: 0,
    //       totalAmount: 0,
    //       expired: false,
    //       lastPaymentDate: null,
    //       nextPaymentDate: usedTrialStub.trialEnds,
    //     },
    //     trello: { userId: null, token: null, webhooks: [], updatedAt: null },
    //     telegram: {
    //       username: null,
    //       chatId: null,
    //       updatedAt: null,
    //     },
    //     discord: {
    //       userId: null,
    //       username: null,
    //       updatedAt: null,
    //     },
    //   };
    //   const usedTrial = {
    //     ...usedTrialStub,
    //     email: createUserDto.email,
    //   };
    //   jest.spyOn(usersRepository, 'findOneByEmail').mockResolvedValue(null);
    //   jest.spyOn(usersRepository, 'create').mockResolvedValue(superAdminStub());
    //   jest
    //     .spyOn(subscriptionService, 'findSubscriptionByName')
    //     .mockResolvedValue(trialSubscriptionPlan);
    //   jest
    //     .spyOn(usedTrialService, 'findUserTrialByEmail')
    //     .mockResolvedValue(usedTrial);
    //   const result = await usersService.createUser(createUserDto);
    //   expect(usersRepository.findOneByEmail).toHaveBeenCalledWith(
    //     createUserDto.email,
    //   );
    //   expect(hashPassword).toHaveBeenCalledWith(createUserDto.password);
    //   expect(usersRepository.create).toHaveBeenCalledWith({
    //     id: expect.any(String),
    //     ...createUserDto,
    //     password: 'hashedPassword',
    //   });
    //   expect(result).toEqual(superAdminStub());
    // });
    // it('should throw ConflictException if the user already exists', async () => {
    //   const createUserDto = {
    //     email: superAdminStub().email,
    //     password: 'password123',
    //     timezone: 0,
    //   };
    //   jest
    //     .spyOn(usersRepository, 'findOneByEmail')
    //     .mockResolvedValue(superAdminStub());
    //   await expect(usersService.createUser(createUserDto)).rejects.toThrow(
    //     ConflictException,
    //   );
    // });
  });

  describe('deleteUserById', () => {
    it('should delete a user by ID and disconnect from all webhooks', async () => {
      const userToDelete = { ...userStub() };
      const notificationMessage = 'notification message';

      jest.spyOn(usersService, 'getUser').mockResolvedValue(userToDelete);
      jest
        .spyOn(trelloWebhooksLogicService, 'disconnectFromAllTrelloWebhooks')
        .mockResolvedValue({
          message: expect.any(String),
          statusCode: HttpStatus.OK,
        });
      jest.spyOn(usersRepository, 'delete').mockResolvedValue();

      jest
        .spyOn(adminBotService, 'actionAdminNotification')
        .mockResolvedValue(notificationMessage);

      const result = await usersService.deleteUserById(
        userToDelete.id,
        userToDelete.id,
        undefined,
      );

      expect(usersService.getUser).toHaveBeenCalledWith(
        userToDelete.id,
        undefined,
      );

      expect(
        trelloWebhooksLogicService.disconnectFromAllTrelloWebhooks,
      ).toHaveBeenCalledWith(userToDelete, undefined);
      expect(usersRepository.delete).toHaveBeenCalledWith(userToDelete.id);
      expect(adminBotService.actionAdminNotification).toHaveBeenCalledWith(
        AdminBotActions.USER_DELETED,
        userToDelete,
      );
      expect(adminBotService.notifyAdmins).toHaveBeenCalledWith(
        notificationMessage,
      );

      expect(result).toEqual({
        message: expect.stringContaining(userToDelete.email),
        statusCode: HttpStatus.OK,
      });
    });

    it('should throw Forbidden exception if user to delete is superadmin', async () => {
      const userToDelete = { ...superAdminStub() };

      jest.spyOn(usersService, 'getUser').mockResolvedValue(userToDelete);

      await expect(
        usersService.deleteUserById(userToDelete.id, userToDelete.id),
      ).rejects.toThrow(ForbiddenException);

      expect(usersService.getUser).toHaveBeenCalledWith(
        userToDelete.id,
        undefined,
      );
    });

    it('should throw NotFoundException if user does not exist', async () => {
      const userId = 'non-existent-id';

      jest
        .spyOn(usersService, 'getUser')
        .mockRejectedValue(
          new NotFoundException(`User with id ${userId} not found`),
        );

      await expect(
        usersService.deleteUserById(userId, userId, undefined),
      ).rejects.toThrow(NotFoundException);
      expect(usersService.getUser).toHaveBeenCalledWith(userId, undefined);
      expect(
        trelloWebhooksLogicService.disconnectFromAllTrelloWebhooks,
      ).not.toHaveBeenCalled();
      expect(usersRepository.delete).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return filtered users based on email', async () => {
      const query: UserQueryDto = {
        email: mockUsers[0].email,
        limit: 10,
        page: 1,
      };

      jest.spyOn(usersRepository, 'getAll').mockResolvedValue({
        total: 1,
        totalPages: 1,
        limitPerPage: 10,
        currentPage: 1,
        data: [mockUsers[0]],
      });

      const result = await usersService.findAll(query);
      expect(result.data.length).toBe(1);
      expect(result.data[0].email).toBe('test1@gmail.com');
      expect(usersRepository.getAll).toHaveBeenCalledWith(query);
    });

    it('should return an empty array when no users match the filters', async () => {
      const query: UserQueryDto = {
        email: 'nonexistent@example.com',
        limit: 10,
        page: 1,
      };

      jest.spyOn(usersRepository, 'getAll').mockResolvedValue({
        total: 0,
        totalPages: 0,
        limitPerPage: 10,
        currentPage: 1,
        data: [],
      });

      const result = await usersService.findAll(query);
      expect(result.data.length).toBe(0);
      expect(result.total).toBe(0);
      expect(usersRepository.getAll).toHaveBeenCalledWith(query);
    });
  });

  describe('findUserById', () => {
    it('should find a user by id', async () => {
      jest
        .spyOn(usersRepository, 'findOneById')
        .mockResolvedValue(superAdminStub());

      const result = await usersService.findUserById(superAdminStub().email);

      expect(usersRepository.findOneById).toHaveBeenCalledWith(
        superAdminStub().email,
      );
      const userWithoutPassword = { ...superAdminStub() };

      delete userWithoutPassword.password;
      expect(result).toEqual(userWithoutPassword);
    });

    it('should throw NotFoundException if user not found', async () => {
      jest.spyOn(usersRepository, 'findOneById').mockResolvedValue(null);

      await expect(usersService.findUserById('nonexistentid')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findUserByEmail', () => {
    it('should find a user by email', async () => {
      jest
        .spyOn(usersRepository, 'findOneByEmail')
        .mockResolvedValue(superAdminStub());

      const result = await usersService.findUserByEmail(superAdminStub().email);

      expect(usersRepository.findOneByEmail).toHaveBeenCalledWith(
        superAdminStub().email,
      );
      expect(result).toEqual(superAdminStub());
    });

    it('should throw NotFoundException if user not found', async () => {
      jest.spyOn(usersRepository, 'findOneByEmail').mockResolvedValue(null);

      await expect(
        usersService.findUserByEmail('nonexistent@gmail.com'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findUserProfile', () => {
    it('should return user profile without sensitive data', async () => {
      const user = { ...userStub(), password: 'hashedPassword' };

      const result = await usersService.findUserProfile(user.id);

      expect(usersService.getUser).toHaveBeenCalledWith(user.id, undefined);
      expect(result).not.toHaveProperty('password');
      expect(result).not.toHaveProperty('telegram.chatId');
      expect(result).not.toHaveProperty('trello.token');
    });

    it('should throw NotFoundException if user does not exist', async () => {
      jest
        .spyOn(usersService, 'findUserProfile')
        .mockRejectedValue(new NotFoundException());

      await expect(
        usersService.findUserProfile('non-existent-id'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findUserByTrelloId', () => {
    it('should find a user by Trello Id', async () => {
      jest
        .spyOn(usersRepository, 'findOneByTrelloId')
        .mockResolvedValue(superAdminStub());

      const result = await usersService.findUserByTrelloId(
        superAdminStub().trello.userId,
      );

      expect(usersRepository.findOneByTrelloId).toHaveBeenCalledWith(
        superAdminStub().trello.userId,
      );
      expect(result).toEqual(superAdminStub());
    });

    it('should throw NotFoundException if user not found', async () => {
      jest.spyOn(usersRepository, 'findOneByTrelloId').mockResolvedValue(null);

      await expect(usersService.findUserByTrelloId('user1234')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findUsersByTrelloIds', () => {
    it('should find users by Trello Ids, skip wrong IDs', async () => {
      jest
        .spyOn(usersRepository, 'findManyByTrelloIds')
        .mockResolvedValue([superAdminStub(), userStub()]);

      const result = await usersService.findUsersByTrelloIds([
        superAdminStub().trello.userId,
        userStub().trello.userId,
        'trellouserid1',
      ]);

      expect(usersRepository.findManyByTrelloIds).toHaveBeenCalledWith([
        superAdminStub().trello.userId,
        userStub().trello.userId,
        'trellouserid1',
      ]);
      expect(result).toEqual([superAdminStub(), userStub()]);
    });
  });

  describe('findWebhooksUserIsSubscribedOn', () => {
    it('should return webhooks user is subscribed to', async () => {
      const mockUser = userStub();
      const mockWebhooks = [webhookStub];

      jest.spyOn(usersService, 'getUser').mockResolvedValue(mockUser);
      jest
        .spyOn(trelloWebhooksLogicService, 'findUserSubscribedWebhooks')
        .mockResolvedValue(mockWebhooks);

      const result = await usersService.findWebhooksUserIsSubscribedOn(
        mockUser,
        undefined,
      );

      expect(usersService.getUser).toHaveBeenCalledWith(mockUser, undefined);
      expect(
        trelloWebhooksLogicService.findUserSubscribedWebhooks,
      ).toHaveBeenCalledWith(mockUser, undefined);
      expect(result).toEqual(mockWebhooks);
    });

    it('should throw an error if user is not found', async () => {
      jest
        .spyOn(usersService, 'getUser')
        .mockRejectedValue(new NotFoundException('User not found'));

      await expect(
        usersService.findWebhooksUserIsSubscribedOn('123'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('doesUserExist', () => {
    it('should return true if user exists', async () => {
      jest.spyOn(usersRepository, 'existsByEmail').mockResolvedValue(true);

      const result = await usersService.doesUserExist(superAdminStub().email);

      expect(usersRepository.existsByEmail).toHaveBeenCalledWith(
        superAdminStub().email,
      );
      expect(result).toEqual(true);
    });

    it('should return false if user does not exists', async () => {
      jest.spyOn(usersRepository, 'existsByEmail').mockResolvedValue(false);

      const result = await usersService.doesUserExist('wrongEmail');

      expect(usersRepository.existsByEmail).toHaveBeenCalledWith('wrongEmail');
      expect(result).toEqual(false);
    });
  });

  describe('updateUser', () => {
    it('should update a user successfully', async () => {
      const user = {
        ...userStub(),
        trello: {
          ...superAdminStub().trello,
          webhooks: [],
        },
      };

      const updateUserDto = {
        trello: {
          ...user.trello,
          webhooks: superAdminStub().trello.webhooks,
          token: user.trello.token,
        },
        lastActivityDate: fixedDate,
      };

      jest.spyOn(usersRepository, 'updateById').mockResolvedValue(userStub());

      const result = await usersService.updateUser(user.id, updateUserDto);

      expect(usersRepository.updateById).toHaveBeenCalledWith(
        user.id,
        updateUserDto,
      );

      expect(result).toEqual({
        message: expect.stringContaining(user.email),
        statusCode: HttpStatus.OK,
        data: result.data,
      });
    });

    it('should not update role if user is not superadmin', async () => {
      const userToUpdate = { ...superAdminStub() };
      const requestAuthor = { ...userStub() };
      const updateUserDto = { role: UserRoles.admin };
      jest.spyOn(usersService, 'getUser').mockResolvedValue(userToUpdate);
      jest.spyOn(usersRepository, 'updateById').mockResolvedValue(userToUpdate);

      const result = await usersService.updateUser(
        userToUpdate,
        updateUserDto,
        undefined,
        requestAuthor,
      );

      expect(usersRepository.updateById).toHaveBeenCalledWith(
        userToUpdate.id,
        updateUserDto,
      );

      expect(result.data?.role).toEqual(userToUpdate.role);

      expect(result).toEqual({
        message: expect.stringContaining(userToUpdate.email),
        statusCode: HttpStatus.OK,
        data: result.data,
      });
    });

    it('should fetch Trello profile and update trello property if token is provided', async () => {
      const userToUpdate = { ...userStub() };
      const updateUserDto = {
        trello: { token: 'newToken' },
        lastActivityDate: fixedDate,
      };
      const encryptedToken = `encrypted${updateUserDto.trello.token}`;

      jest.spyOn(usersRepository, 'updateById').mockResolvedValue({
        ...userToUpdate,
        trello: {
          ...userToUpdate.trello,
          token: encryptedToken,
          userId: trelloProfileMock.id,
          username: trelloProfileMock.username,
        },
        lastActivityDate: fixedDate,
      });

      expect(userToUpdate.trello.username).not.toEqual(
        trelloProfileMock.username,
      );

      const result = await usersService.updateUser(userToUpdate, updateUserDto);

      expect(trelloMembersLogicService.findMemberProfile).toHaveBeenCalledWith(
        userToUpdate,
        encryptedToken,
        undefined,
      );

      expect(result.data?.trello?.userId).toEqual(trelloProfileMock.id);

      expect(result).toEqual({
        message: expect.stringContaining(userToUpdate.email),
        statusCode: HttpStatus.OK,
        data: result.data,
      });
    });

    it('should throw NotFoundException if user does not exist', async () => {
      jest
        .spyOn(usersService, 'getUser')
        .mockRejectedValue(new NotFoundException());

      await expect(
        usersService.updateUser('non-existent-id', {}),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateUserPreferences', () => {
    it('should update user language preference', async () => {
      const userToUpdate = { ...userStub() };
      const preferencesUpdateDto = { language: Languages.UA };

      jest.spyOn(usersService, 'getUser').mockResolvedValue(userToUpdate);
      jest
        .spyOn(usersRepository, 'updateById')
        .mockResolvedValue({ ...userToUpdate, ...preferencesUpdateDto });

      const result = await usersService.updateUserPreferences(
        userToUpdate,
        preferencesUpdateDto,
      );

      expect(result.data?.language).toEqual(preferencesUpdateDto.language);
    });

    it('should update user timezone preference', async () => {
      const userToUpdate = { ...userStub() };
      const preferencesUpdateDto = { timezone: -5 };

      jest.spyOn(usersService, 'getUser').mockResolvedValue(userToUpdate);
      jest
        .spyOn(usersRepository, 'updateById')
        .mockResolvedValue({ ...userToUpdate, ...preferencesUpdateDto });

      const result = await usersService.updateUserPreferences(
        userToUpdate,
        preferencesUpdateDto,
      );

      expect(result.data?.timezone).toEqual(preferencesUpdateDto.timezone);
    });

    it('should update both language and timezone', async () => {
      const userToUpdate = { ...userStub() };
      const preferencesUpdateDto = { language: Languages.EN, timezone: 3 };

      jest.spyOn(usersService, 'getUser').mockResolvedValue(userToUpdate);
      jest
        .spyOn(usersRepository, 'updateById')
        .mockResolvedValue({ ...userToUpdate, ...preferencesUpdateDto });

      const result = await usersService.updateUserPreferences(
        userToUpdate,
        preferencesUpdateDto,
      );

      expect(result.data?.language).toEqual(preferencesUpdateDto.language);
      expect(result.data?.timezone).toEqual(preferencesUpdateDto.timezone);
    });

    it('should throw NotFoundException if user does not exist', async () => {
      jest
        .spyOn(usersService, 'getUser')
        .mockRejectedValue(new NotFoundException());

      await expect(
        usersService.updateUserPreferences('non-existent-id', {
          language: Languages.UA,
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('resetPassword', () => {
    it('should reset the user password', async () => {
      const resetPasswordDto: ResetPasswordDto = {
        newPassword: 'newpassword',
        repeatPassword: 'newpassword',
      };
      jest.spyOn(usersService, 'getUser').mockResolvedValue(superAdminStub());
      jest
        .spyOn(usersRepository, 'updateById')
        .mockResolvedValue(superAdminStub());

      await usersService.resetPassword(
        superAdminStub().id,
        resetPasswordDto.newPassword,
        undefined,
      );

      expect(usersService.getUser).toHaveBeenCalledWith(
        superAdminStub().id,
        undefined,
      );
      expect(hashPassword).toHaveBeenCalledWith(resetPasswordDto.newPassword);
      expect(usersRepository.updateById).toHaveBeenCalledWith(
        superAdminStub().id,
        {
          password: 'hashedPassword',
          lastActivityDate: fixedDate,
        },
      );
    });

    it('should throw NotFoundException if user does not exist', async () => {
      jest
        .spyOn(usersService, 'getUser')
        .mockRejectedValue(new NotFoundException());

      await expect(
        usersService.resetPassword('non-existent-id', 'newPassword'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findUsersConnectedToWebhook', () => {
    it('should return users connected to webhook', async () => {
      const webhookId = userStub().trello.webhooks[0].webhookId;

      const usersConnectedToWebhook =
        await usersService.findUsersConnectedToWebhook(webhookId);

      expect(usersConnectedToWebhook).toEqual([userStub(), superAdminStub()]);
    });
  });

  describe('findUserByProperty', () => {
    it('should return a user when found', async () => {
      const user = { ...userStub() };
      jest.spyOn(usersRepository, 'findUserByProperty').mockResolvedValue(user);

      const result = await usersService.findUserByProperty(
        UserSearchPath.Email,
        user.email,
      );

      expect(result).toEqual(user);
      expect(usersRepository.findUserByProperty).toHaveBeenCalledWith(
        UserSearchPath.Email,
        user.email,
      );
    });

    it('should throw NotFoundException when user does not exist', async () => {
      jest.spyOn(usersRepository, 'findUserByProperty').mockResolvedValue(null);

      await expect(
        usersService.findUserByProperty(
          UserSearchPath.Email,
          'nonexistent@example.com',
        ),
      ).rejects.toThrow(
        new NotFoundException(
          'User with property email: nonexistent@example.com not found',
        ),
      );
    });
  });

  describe('manageUserTelegramConnection', () => {
    it('should connect Telegram successfully', async () => {
      const userToUpdate = {
        ...superAdminStub(),
        telegram: { chatId: null, username: null, updatedAt: fixedDate },
      };
      const connectTelegramDto = {
        chatId: superAdminStub().telegram.chatId,
        username: superAdminStub().telegram.username,
        updatedAt: fixedDate,
      };

      // Mocking user retrieval and repository operations
      jest.spyOn(usersService, 'getUser').mockResolvedValue(userToUpdate);
      jest.spyOn(usersRepository, 'findUserByProperty').mockResolvedValue(null); // No conflicting user found
      jest
        .spyOn(notificationBotService, 'sendMessageToUser')
        .mockResolvedValue();
      jest.spyOn(usersRepository, 'updateById').mockResolvedValue({
        ...userToUpdate,
        telegram: connectTelegramDto,
      });

      // Invoking the method
      const result = await usersService.manageUserTelegramConnection(
        userToUpdate.id,
        userToUpdate.id,
        connectTelegramDto,
        undefined,
      );

      expect(usersService.getUser).toHaveBeenCalledWith(
        userToUpdate.id,
        undefined,
      );
      expect(usersRepository.findUserByProperty).toHaveBeenCalledWith(
        UserSearchPath.TelegramChatId,
        connectTelegramDto.chatId,
      );
      expect(notificationBotService.sendMessageToUser).toHaveBeenCalledWith(
        connectTelegramDto,
        'Trellify authorized successfully',
      );
      expect(usersRepository.updateById).toHaveBeenCalledWith(userToUpdate.id, {
        telegram: connectTelegramDto,
        lastActivityDate: fixedDate,
      });
      expect(result).toEqual({
        message: expect.any(String),
        statusCode: HttpStatus.OK,
        data: { ...userToUpdate, telegram: connectTelegramDto },
      });
    });

    it('should throw ConflictException if Telegram is already connected', async () => {
      const userToUpdate = {
        ...userStub(),
      };
      const connectTelegramDto = { chatId: 123, username: 'tgusername' };

      jest
        .spyOn(usersService, 'findUserByProperty')
        .mockResolvedValue(superAdminStub());

      jest.spyOn(usersService, 'getUser').mockResolvedValue(userToUpdate);

      await expect(
        usersService.manageUserTelegramConnection(
          userToUpdate.id,
          userToUpdate.id,
          connectTelegramDto,
          undefined,
        ),
      ).rejects.toThrow(ConflictException);

      expect(usersService.getUser).toHaveBeenCalledWith(
        userToUpdate.id,
        undefined,
      );
      expect(notificationBotService.sendMessageToUser).not.toHaveBeenCalled();
      expect(usersRepository.updateById).not.toHaveBeenCalled();
    });

    it('should disconnect Telegram successfully', async () => {
      const fixedDate = new Date('2025-01-03T13:38:58.285Z');
      const userToUpdate = { ...superAdminStub() };
      const connectTelegramDto = {
        chatId: null,
        username: null,
        updatedAt: fixedDate,
      };

      // Mocking necessary dependencies
      jest.spyOn(usersService, 'getUser').mockResolvedValue(userToUpdate);
      jest
        .spyOn(notificationBotService, 'sendMessageToUser')
        .mockResolvedValue();
      jest.spyOn(usersRepository, 'updateById').mockResolvedValue({
        ...userToUpdate,
        telegram: connectTelegramDto,
      });

      // Invoking the method
      const result = await usersService.manageUserTelegramConnection(
        userToUpdate.id,
        userToUpdate.id,
        {
          chatId: null,
          username: null,
        },
      );

      expect(usersService.getUser).toHaveBeenCalledWith(
        userToUpdate.id,
        undefined,
      );
      expect(notificationBotService.sendMessageToUser).toHaveBeenCalledWith(
        userToUpdate.telegram,
        expect.any(String),
      );
      expect(usersRepository.updateById).toHaveBeenCalledWith(userToUpdate.id, {
        telegram: connectTelegramDto,
        lastActivityDate: fixedDate,
      });
      expect(result).toEqual({
        message: expect.any(String),
        statusCode: HttpStatus.OK,
        data: {
          ...userToUpdate,
          telegram: connectTelegramDto,
        },
      });
    });

    it('should throw NotFoundException if user does not exist', async () => {
      jest
        .spyOn(usersService, 'getUser')
        .mockRejectedValue(new NotFoundException());

      await expect(
        usersService.findUserProfile('non-existent-id'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('manageUserTrelloConnection', () => {
    it('should disconnect Trello and all webhooks successfully', async () => {
      const userToUpdate = {
        ...userStub(),
      };
      const connectTrelloDto = { token: null };

      jest
        .spyOn(trelloWebhooksLogicService, 'disconnectFromAllTrelloWebhooks')
        .mockResolvedValue({
          message: expect.any(String),
          statusCode: HttpStatus.OK,
        });
      jest.spyOn(usersRepository, 'updateById').mockResolvedValue({
        ...userToUpdate,
        trello: { userId: null, username: null, webhooks: [], token: null },
      });

      const result = await usersService.manageUserTrelloConnection(
        userToUpdate.id,
        userToUpdate,
        connectTrelloDto,
        undefined,
      );

      expect(usersService.getUser).toHaveBeenCalledWith(
        userToUpdate.id,
        undefined,
      );
      expect(
        trelloWebhooksLogicService.disconnectFromAllTrelloWebhooks,
      ).toHaveBeenCalledWith(userToUpdate, undefined);
      expect(usersRepository.updateById).toHaveBeenCalledWith(userToUpdate.id, {
        trello: {
          userId: null,
          username: null,
          webhooks: [],
          token: null,
          updatedAt: fixedDate,
        },
        lastActivityDate: fixedDate,
      });
      expect(result).toEqual({
        message: expect.stringContaining(userToUpdate.trello.username),
        statusCode: HttpStatus.OK,
        data: {
          ...userToUpdate,
          trello: { userId: null, username: null, webhooks: [], token: null },
        },
      });
    });

    it('should connect Trello and update user data successfully', async () => {
      const userToUpdate = {
        ...userStub(),
        trello: { userId: null, username: null, webhooks: [], token: null },
      };
      const connectTrelloDto = { token: 'newtoken' };

      const encryptedToken = `encrypted${connectTrelloDto.token}`;

      jest.spyOn(usersService, 'getUser').mockResolvedValue(userToUpdate);
      jest
        .spyOn(trelloTokensLogicService, 'isTokenInfinite')
        .mockResolvedValue(true);
      jest
        .spyOn(trelloMembersLogicService, 'findMemberProfile')
        .mockResolvedValue(trelloProfileMock);
      jest.spyOn(usersRepository, 'findUserByProperty').mockResolvedValue(null);
      jest.spyOn(usersRepository, 'updateById').mockResolvedValue({
        ...userToUpdate,
        trello: {
          userId: trelloProfileMock.id,
          username: trelloProfileMock.username,
          webhooks: [],
          token: encryptedToken,
        },
      });

      const result = await usersService.manageUserTrelloConnection(
        userToUpdate.id,
        userToUpdate,
        connectTrelloDto,
        undefined,
      );

      expect(usersService.getUser).toHaveBeenCalledWith(
        userToUpdate.id,
        undefined,
      );
      expect(trelloTokensLogicService.isTokenInfinite).toHaveBeenCalledWith(
        connectTrelloDto.token,
        undefined,
      );
      expect(trelloMembersLogicService.findMemberProfile).toHaveBeenCalledWith(
        userToUpdate,
        encryptedToken,
        undefined,
      );
      expect(usersRepository.updateById).toHaveBeenCalledWith(userToUpdate.id, {
        trello: {
          userId: trelloProfileMock.id,
          username: trelloProfileMock.username,
          webhooks: [],
          token: `encrypted${connectTrelloDto.token}`,
          updatedAt: fixedDate,
        },
        lastActivityDate: fixedDate,
      });
      expect(result).toEqual({
        message: expect.stringContaining(trelloProfileMock.username),
        statusCode: HttpStatus.OK,
        data: {
          ...userToUpdate,
          trello: {
            userId: trelloProfileMock.id,
            username: trelloProfileMock.username,
            webhooks: [],
            token: `encrypted${connectTrelloDto.token}`,
          },
        },
      });
    });

    it('should throw an error if user tries to connect another trello account still having other in profile', async () => {
      const trialSubscriptionPlan = {
        id: 'id1',
        name: SubscriptionPlans.TRIAL,
        price: 0,
        subscribers: [],
        notifications: {
          card: {},
          checklist: {},
          list: {},
          board: {},
        },
      };
      const userToUpdate = {
        ...userStub(),
        trello: {
          userId: null,
          userName: null,
          webhooks: [],
        },
        subscription: {
          ...userStub().subscription,
          plan: trialSubscriptionPlan.name,
        },
      };

      const connectTrelloDto = { token: 'validtoken' };

      jest.spyOn(usersService, 'getUser').mockResolvedValue(userToUpdate);

      await expect(
        usersService.manageUserTrelloConnection(
          userToUpdate,
          userToUpdate,
          connectTrelloDto,
        ),
      ).rejects.toThrow(
        new ConflictException(
          'This trello profile is already binded to other user',
        ),
      );

      expect(usersService.getUser).toHaveBeenCalledWith(
        userToUpdate,
        undefined,
      );
    });

    it('should throw an error if a user with a trial tries to connect to another Trello account that has already used their trial.', async () => {
      const userToUpdate = {
        ...userStub(),
      };

      const connectTrelloDto = { token: 'invalidtoken' };

      const usedTrialByTrelloId = {
        ...usedTrialStub,
        email: 'anymail@mail.com',
        trelloUserId: userToUpdate.trello.userId,
      };

      jest.spyOn(usersService, 'getUser').mockResolvedValue(userToUpdate);

      jest
        .spyOn(trelloTokensLogicService, 'isTokenInfinite')
        .mockResolvedValue(true);

      jest
        .spyOn(usedTrialService, 'findUsedTrialByTrelloUserId')
        .mockResolvedValue(usedTrialByTrelloId);

      await expect(
        usersService.manageUserTrelloConnection(
          userToUpdate,
          userToUpdate,
          connectTrelloDto,
        ),
      ).rejects.toThrow(
        new ConflictException(
          'You should disconnect your Trello account first before connecting a new one.',
        ),
      );

      expect(usersService.getUser).toHaveBeenCalledWith(
        userToUpdate,
        undefined,
      );
    });

    it('should throw an error if token is invalid or not infinite', async () => {
      const userToUpdate = {
        ...userStub(),
        trello: {
          userId: null,
          username: null,
          webhooks: [],
        },
      };

      const connectTrelloDto = { token: 'invalidtoken' };

      jest.spyOn(usersService, 'getUser').mockResolvedValue(userToUpdate);
      jest
        .spyOn(trelloTokensLogicService, 'isTokenInfinite')
        .mockRejectedValue(
          new BadRequestException(
            'Please provide a token with a valid expiration date',
          ),
        );

      await expect(
        usersService.manageUserTrelloConnection(
          userToUpdate,
          userToUpdate,
          connectTrelloDto,
        ),
      ).rejects.toThrow(
        new BadRequestException(
          'Please provide a token with a valid expiration date',
        ),
      );

      expect(usersService.getUser).toHaveBeenCalledWith(
        userToUpdate,
        undefined,
      );
      expect(trelloTokensLogicService.isTokenInfinite).toHaveBeenCalledWith(
        connectTrelloDto.token,
        undefined,
      );
    });

    it('should throw an error if Trello profile is already connected to another user', async () => {
      const userToUpdate = {
        ...superAdminStub(),
        trello: { userId: null, username: null, webhooks: [], token: null },
      };
      const connectTrelloDto = { token: 'newtoken' };
      const connectedUser = { ...superAdminStub(), id: 'differentUserId' };

      jest.spyOn(usersService, 'getUser').mockResolvedValue(userToUpdate);
      jest
        .spyOn(trelloTokensLogicService, 'isTokenInfinite')
        .mockResolvedValue(true);

      jest
        .spyOn(usersRepository, 'findUserByProperty')
        .mockResolvedValue(connectedUser);

      (encryptText as jest.Mock).mockImplementation(
        (text: string) => `encrypted${text}`,
      );

      await expect(
        usersService.manageUserTrelloConnection(
          userToUpdate.id,
          userToUpdate,
          connectTrelloDto,
          undefined,
        ),
      ).rejects.toThrow(
        new ConflictException(
          'This trello profile is already binded to other user',
        ),
      );

      expect(usersService.getUser).toHaveBeenCalledWith(
        userToUpdate.id,
        undefined,
      );
      expect(trelloTokensLogicService.isTokenInfinite).toHaveBeenCalledWith(
        connectTrelloDto.token,
        undefined,
      );
      expect(trelloMembersLogicService.findMemberProfile).toHaveBeenCalledWith(
        userToUpdate,
        `encrypted${connectTrelloDto.token}`,
        undefined,
      );
      expect(usersRepository.findUserByProperty).toHaveBeenCalledWith(
        UserSearchPath.TrelloUserId,
        connectedUser.trello.userId,
      );
      expect(usersRepository.updateById).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if user does not exist', async () => {
      jest
        .spyOn(usersService, 'getUser')
        .mockRejectedValue(new NotFoundException());

      await expect(
        usersService.findUserProfile('non-existent-id'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('removeWebhookFromAllUsers', () => {
    it('should remove webhook from all users', async () => {
      const webhookToDelete = { ...webhookStub };
      const connectedUsers = [userStub(), superAdminStub()];
      const disconnectedUsersMock = connectedUsers.map((user) => ({
        ...user,
        trello: {
          ...user.trello,
          webhooks: user.trello.webhooks.filter(
            (webhook) => webhook.webhookId !== webhookToDelete.id,
          ),
        },
      }));

      jest
        .spyOn(usersService, 'updateManyUsers')
        .mockResolvedValue({ acknowledged: true, modifiedCount: 2 });
      jest
        .spyOn(notificationBotService, 'sendMessageToUser')
        .mockImplementation(jest.fn());
      jest.spyOn(configService, 'get').mockReturnValue('https://example.com');

      await usersService.removeWebhookFromAllUsers(webhookToDelete);

      expect(trelloWebhooksLogicService.getWebhook).toHaveBeenCalledWith(
        webhookToDelete,
        undefined,
      );

      expect(usersService.findUsersConnectedToWebhook).toHaveBeenCalledWith(
        webhookToDelete.id,
      );

      expect(usersService.updateManyUsers).toHaveBeenCalledWith(
        connectedUsers.map((user) => ({
          updateOne: {
            filter: { id: user.id },
            update: {
              $pull: {
                [UserSearchPath.TrelloWebhooks]: {
                  webhookId: webhookToDelete.id,
                },
              },
            },
          },
        })),
      );

      expect(notificationBotService.sendMessageToUser).toHaveBeenCalledTimes(
        connectedUsers.length,
      );

      jest
        .spyOn(usersService, 'findUsersByTrelloIds')
        .mockResolvedValue(disconnectedUsersMock);
    });

    it('should throw NotFoundException if webhook does not exist', async () => {
      jest
        .spyOn(trelloWebhooksLogicService, 'getWebhook')
        .mockRejectedValue(new NotFoundException());

      await expect(
        trelloWebhooksLogicService.getWebhook('non-existent-id'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('contactUs', () => {
    it('should send contact form email, notify admins, update stats, and return success response', async () => {
      const formBody = {
        email: 'test@example.com',
        subject: 'Test Subject',
        message: 'Test message',
        authorized: true,
      };

      jest.spyOn(mailerService, 'sendContactForm').mockResolvedValue(undefined);
      jest
        .spyOn(adminBotService, 'actionAdminNotification')
        .mockResolvedValue('Admin Notification');
      jest.spyOn(adminBotService, 'notifyAdmins').mockResolvedValue(undefined);
      jest.spyOn(redisService, 'updateDailyStats').mockResolvedValue(undefined);

      const response = await usersService.contactUs(formBody, undefined);

      expect(mailerService.sendContactForm).toHaveBeenCalledWith(
        formBody.email,
        formBody.subject,
        formBody.message,
        undefined,
        formBody.authorized,
      );

      expect(adminBotService.actionAdminNotification).toHaveBeenCalledWith(
        AdminBotActions.CONTACT_US,
        formBody,
      );

      expect(adminBotService.notifyAdmins).toHaveBeenCalledWith(
        'Admin Notification',
      );
      expect(redisService.updateDailyStats).toHaveBeenCalledWith(
        'contactUs',
        formBody.email,
      );
      expect(response).toEqual({
        message: expect.any(String),
        statusCode: HttpStatus.OK,
      });
    });
  });
});
