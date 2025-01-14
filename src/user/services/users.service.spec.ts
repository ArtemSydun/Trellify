import { Test } from '@nestjs/testing';
import { UsersService } from './users.service';
import { UsersRepository } from '../repositories/users.repository';
import { SharedConfigService } from 'src/config/shared.config.service';
import {
  TrelloMembersLogicService,
  TrelloTokensLogicService,
  TrelloWebhooksLogicService,
} from '@trello/logic';
import { TelegramService } from 'src/telegram/telegram.service';
import {
  BadRequestException,
  ConflictException,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import { createMock } from '@golevelup/ts-jest';
import { userStub } from '../__mocks__/user.stub';
import { encryptText, hashPassword } from 'src/common/helpers/hashing';
import { ResetPasswordDto } from 'src/auth/dto/reset-password.dto';
import { trelloProfileMock } from 'src/trello/__mocks__/trello.stub';
import { UserSearchPathEnum } from '../enums/query.enum';

jest.mock('src/common/helpers/hashing', () => ({
  hashPassword: jest.fn(),
  encryptText: jest.fn(),
}));

describe('UsersService', () => {
  let originalDate = Date;

  let usersService: UsersService;
  let usersRepository: UsersRepository;
  let trelloMembersLogicService: TrelloMembersLogicService;
  let trelloTokensLogicService: TrelloTokensLogicService;
  let trelloWebhooksLogicService: TrelloWebhooksLogicService;
  let telegramService: TelegramService;

  const fixedDate = userStub().telegram.updatedAt;

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
          provide: SharedConfigService,
          useValue: createMock<SharedConfigService>(),
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
        { provide: TelegramService, useValue: createMock<TelegramService>() },
      ],
    }).compile();

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
    telegramService = moduleRef.get<TelegramService>(TelegramService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    global.Date = originalDate;
  });

  jest.mock('src/common/helpers/hashing', () => ({
    hashPassword: jest.fn(),
    encryptText: jest.fn(),
  }));

  describe('createUser', () => {
    it('should create a new user successfully', async () => {
      const createUserDto = {
        email: userStub().email,
        password: 'password123',
      };
      jest.spyOn(usersRepository, 'findOneByEmail').mockResolvedValue(null);
      (hashPassword as jest.Mock).mockResolvedValue('hashedPassword');
      jest.spyOn(usersRepository, 'create').mockResolvedValue(userStub());

      const result = await usersService.createUser(createUserDto);

      expect(usersRepository.findOneByEmail).toHaveBeenCalledWith(
        createUserDto.email,
      );
      expect(hashPassword).toHaveBeenCalledWith(createUserDto.password);
      expect(usersRepository.create).toHaveBeenCalledWith({
        id: expect.any(String),
        email: createUserDto.email,
        password: 'hashedPassword',
      });
      expect(result).toEqual(userStub());
    });

    it('should throw ConflictException if the user already exists', async () => {
      const createUserDto = {
        email: userStub().email,
        password: 'password123',
      };
      jest
        .spyOn(usersRepository, 'findOneByEmail')
        .mockResolvedValue(userStub());

      await expect(usersService.createUser(createUserDto)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('findUserByEmail', () => {
    it('should find a user by email', async () => {
      jest
        .spyOn(usersRepository, 'findOneByEmail')
        .mockResolvedValue(userStub());

      const result = await usersService.findUserByEmail(userStub().email);

      expect(usersRepository.findOneByEmail).toHaveBeenCalledWith(
        userStub().email,
      );
      expect(result).toEqual(userStub());
    });

    it('should throw NotFoundException if user not found', async () => {
      jest.spyOn(usersRepository, 'findOneByEmail').mockResolvedValue(null);

      await expect(
        usersService.findUserByEmail('nonexistent@gmail.com'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteUserById', () => {
    it('should delete a user by ID and disconnect from all webhooks', async () => {
      const userToDelete = { ...userStub() };

      jest.spyOn(usersService, 'getUser').mockResolvedValue(userToDelete);
      jest
        .spyOn(trelloWebhooksLogicService, 'disconnectFromAllTrelloWebhooks')
        .mockResolvedValue({
          message: 'webhook message',
          statusCode: HttpStatus.OK,
        });
      jest.spyOn(usersRepository, 'delete').mockResolvedValue();

      const result = await usersService.deleteUserById(userToDelete.id);

      expect(usersService.getUser).toHaveBeenCalledWith(userToDelete.id);
      expect(
        trelloWebhooksLogicService.disconnectFromAllTrelloWebhooks,
      ).toHaveBeenCalledWith(userToDelete);
      expect(usersRepository.delete).toHaveBeenCalledWith(userToDelete.id);
      expect(result).toEqual({
        message: `User ${userToDelete.id} was deleted successfully`,
        statusCode: HttpStatus.OK,
      });
    });

    it('should throw NotFoundException if user does not exist', async () => {
      const userId = 'non-existent-id';

      jest
        .spyOn(usersService, 'getUser')
        .mockRejectedValue(
          new NotFoundException(`User with id ${userId} not found`),
        );

      await expect(usersService.deleteUserById(userId)).rejects.toThrow(
        NotFoundException,
      );
      expect(usersService.getUser).toHaveBeenCalledWith(userId);
      expect(
        trelloWebhooksLogicService.disconnectFromAllTrelloWebhooks,
      ).not.toHaveBeenCalled();
      expect(usersRepository.delete).not.toHaveBeenCalled();
    });
  });

  describe('resetPassword', () => {
    it('should reset the user password', async () => {
      const resetPasswordDto: ResetPasswordDto = {
        newPassword: 'newpassword',
        repeatPassword: 'repeatPassword',
      };
      jest.spyOn(usersService, 'getUser').mockResolvedValue(userStub());
      jest.spyOn(usersRepository, 'updateById').mockResolvedValue(userStub());

      (hashPassword as jest.Mock).mockResolvedValue('hashedPassword');

      await usersService.resetPassword(
        userStub().id,
        resetPasswordDto.newPassword,
      );

      expect(usersService.getUser).toHaveBeenCalledWith(userStub().id);
      expect(hashPassword).toHaveBeenCalledWith(resetPasswordDto.newPassword);
      expect(usersRepository.updateById).toHaveBeenCalledWith(userStub().id, {
        password: 'hashedPassword',
      });
    });
  });

  describe('manageUserTelegramConnection', () => {
    const fixedDate = new Date('2025-01-03T13:38:58.285Z');
    it('should connect Telegram successfully', async () => {
      const userToUpdate = {
        ...userStub(),
        telegram: { chatId: null, username: null, updatedAt: fixedDate },
      };
      const connectTelegramDto = {
        chatId: userStub().telegram.chatId,
        username: userStub().telegram.username,
        updatedAt: fixedDate,
      };

      // Mocking user retrieval and repository operations
      jest.spyOn(usersService, 'getUser').mockResolvedValue(userToUpdate);
      jest.spyOn(usersRepository, 'findUserByProperty').mockResolvedValue(null); // No conflicting user found
      jest.spyOn(telegramService, 'sendMessageToUser').mockResolvedValue();
      jest.spyOn(usersRepository, 'updateById').mockResolvedValue({
        ...userToUpdate,
        telegram: connectTelegramDto,
      });

      // Invoking the method
      const result = await usersService.manageUserTelegramConnection(
        userToUpdate.id,
        connectTelegramDto,
      );

      expect(usersService.getUser).toHaveBeenCalledWith(userToUpdate.id);
      expect(usersRepository.findUserByProperty).toHaveBeenCalledWith(
        UserSearchPathEnum.TelegramChatId,
        connectTelegramDto.chatId,
      );
      expect(telegramService.sendMessageToUser).toHaveBeenCalledWith(
        connectTelegramDto,
        'Trello notifier bot authorized successfully',
      );
      expect(usersRepository.updateById).toHaveBeenCalledWith(userToUpdate.id, {
        telegram: connectTelegramDto,
      });
      expect(result).toEqual({
        message: `Telegram ${connectTelegramDto.username} connected successfully`,
        statusCode: HttpStatus.OK,
        data: { ...userToUpdate, telegram: connectTelegramDto },
      });
    });

    it('should throw ConflictException if Telegram is already connected', async () => {
      const userToUpdate = {
        ...userStub(),
        telegram: {
          chatId: userStub().telegram.chatId,
          username: userStub().telegram.username,
        },
      };
      const connectTelegramDto = { chatId: 123, username: 'tgusername' };
      jest.spyOn(usersService, 'getUser').mockResolvedValue(userToUpdate);

      await expect(
        usersService.manageUserTelegramConnection(
          userToUpdate.id,
          connectTelegramDto,
        ),
      ).rejects.toThrow(ConflictException);
      expect(usersService.getUser).toHaveBeenCalledWith(userToUpdate.id);
      expect(telegramService.sendMessageToUser).not.toHaveBeenCalled();
      expect(usersRepository.updateById).not.toHaveBeenCalled();
    });

    it('should disconnect Telegram successfully', async () => {
      const fixedDate = new Date('2025-01-03T13:38:58.285Z');
      const userToUpdate = { ...userStub() };
      const connectTelegramDto = {
        chatId: null,
        username: null,
        updatedAt: fixedDate,
      };

      // Mocking necessary dependencies
      jest.spyOn(usersService, 'getUser').mockResolvedValue(userToUpdate);
      jest.spyOn(telegramService, 'sendMessageToUser').mockResolvedValue();
      jest.spyOn(usersRepository, 'updateById').mockResolvedValue({
        ...userToUpdate,
        telegram: connectTelegramDto,
      });

      // Invoking the method
      const result = await usersService.manageUserTelegramConnection(
        userToUpdate.id,
        {
          chatId: null,
          username: null,
        },
      );

      expect(usersService.getUser).toHaveBeenCalledWith(userToUpdate.id);
      expect(telegramService.sendMessageToUser).toHaveBeenCalledWith(
        userToUpdate.telegram,
        'Trello notifier bot disconnected successfully',
      );
      expect(usersRepository.updateById).toHaveBeenCalledWith(userToUpdate.id, {
        telegram: connectTelegramDto,
      });
      expect(result).toEqual({
        message: `Telegram ${userToUpdate.telegram.username} disconnected successfully`,
        statusCode: HttpStatus.OK,
        data: {
          ...userToUpdate,
          telegram: connectTelegramDto,
        },
      });
    });
  });

  describe('manageUserTrelloConnection', () => {
    it('should disconnect Trello and all webhooks successfully', async () => {
      const userToUpdate = {
        ...userStub(),
      };
      const connectTrelloDto = { token: null };

      jest.spyOn(usersService, 'getUser').mockResolvedValue(userToUpdate);
      jest
        .spyOn(trelloWebhooksLogicService, 'disconnectFromAllTrelloWebhooks')
        .mockResolvedValue({
          message: 'webhook message',
          statusCode: HttpStatus.OK,
        });
      jest.spyOn(usersRepository, 'updateById').mockResolvedValue({
        ...userToUpdate,
        trello: { userId: null, username: null, webhooks: [], token: null },
      });

      const result = await usersService.manageUserTrelloConnection(
        userToUpdate.id,
        connectTrelloDto,
      );

      expect(usersService.getUser).toHaveBeenCalledWith(userToUpdate.id);
      expect(
        trelloWebhooksLogicService.disconnectFromAllTrelloWebhooks,
      ).toHaveBeenCalledWith(userToUpdate);
      expect(usersRepository.updateById).toHaveBeenCalledWith(userToUpdate.id, {
        trello: { userId: null, username: null, webhooks: [], token: null },
      });
      expect(result).toEqual({
        message: `Trello ${userToUpdate.trello.username} disconnected successfully`,
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
          token: `encrypted${connectTrelloDto.token}`,
        },
      });
      (encryptText as jest.Mock).mockImplementation(
        (text: string) => `encrypted${text}`,
      );

      const result = await usersService.manageUserTrelloConnection(
        userToUpdate.id,
        connectTrelloDto,
      );

      expect(usersService.getUser).toHaveBeenCalledWith(userToUpdate.id);
      expect(trelloTokensLogicService.isTokenInfinite).toHaveBeenCalledWith(
        connectTrelloDto.token,
      );
      expect(trelloMembersLogicService.findMemberProfile).toHaveBeenCalledWith(
        userToUpdate,
        `encrypted${connectTrelloDto.token}`,
      );
      expect(usersRepository.updateById).toHaveBeenCalledWith(userToUpdate.id, {
        trello: {
          userId: trelloProfileMock.id,
          username: trelloProfileMock.username,
          webhooks: [],
          token: `encrypted${connectTrelloDto.token}`,
        },
      });
      expect(result).toEqual({
        message: `Trello ${trelloProfileMock.username} connected successfully`,
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

    it('should throw an error if token is invalid or not infinite', async () => {
      const userToUpdate = { ...userStub() };
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
          userToUpdate.id,
          connectTrelloDto,
        ),
      ).rejects.toThrow(
        new BadRequestException(
          'Please provide a token with a valid expiration date',
        ),
      );

      expect(usersService.getUser).toHaveBeenCalledWith(userToUpdate.id);
      expect(trelloTokensLogicService.isTokenInfinite).toHaveBeenCalledWith(
        connectTrelloDto.token,
      );
    });

    it('should throw an error if Trello profile is already connected to another user', async () => {
      const userToUpdate = {
        ...userStub(),
        trello: { userId: null, username: null, webhooks: [], token: null },
      };
      const connectTrelloDto = { token: 'newtoken' };
      const connectedUser = { ...userStub(), id: 'differentUserId' };

      jest.spyOn(usersService, 'getUser').mockResolvedValue(userToUpdate);
      jest
        .spyOn(trelloTokensLogicService, 'isTokenInfinite')
        .mockResolvedValue(true);
      jest
        .spyOn(trelloMembersLogicService, 'findMemberProfile')
        .mockResolvedValue(trelloProfileMock);
      jest
        .spyOn(usersRepository, 'findUserByProperty')
        .mockResolvedValue(connectedUser);

      await expect(
        usersService.manageUserTrelloConnection(
          userToUpdate.id,
          connectTrelloDto,
        ),
      ).rejects.toThrow(
        new ConflictException(
          'This trello profile is already binded to other user',
        ),
      );

      expect(usersService.getUser).toHaveBeenCalledWith(userToUpdate.id);
      expect(trelloTokensLogicService.isTokenInfinite).toHaveBeenCalledWith(
        connectTrelloDto.token,
      );
      expect(trelloMembersLogicService.findMemberProfile).toHaveBeenCalledWith(
        userToUpdate,
        `encrypted${connectTrelloDto.token}`,
      );
      expect(usersRepository.findUserByProperty).toHaveBeenCalledWith(
        UserSearchPathEnum.TrelloUserId,
        trelloProfileMock.id,
      );
      expect(usersRepository.updateById).not.toHaveBeenCalled();
    });
  });
});
