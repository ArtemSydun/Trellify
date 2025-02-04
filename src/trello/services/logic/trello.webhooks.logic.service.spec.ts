/* eslint-disable @typescript-eslint/no-unused-vars */
import { Test } from '@nestjs/testing';
import { SharedConfigService } from 'src/config/shared.config.service';
import {
  TrelloActionsLogicService,
  TrelloMembersLogicService,
  TrelloTokensLogicService,
  TrelloWebhooksLogicService,
} from '@trello/logic';
import { TelegramService } from 'src/telegram/telegram.service';
import { createMock } from '@golevelup/ts-jest';
import { decryptText, encryptText } from 'src/common/helpers/hashing';

import { newWebhookStub, webhookStub } from 'src/trello/__mocks__/webhook.stub';
import { superAdminStub, userStub } from 'src/user/__mocks__/user.stub';
import { UsersRepository } from 'src/user/repositories/users.repository';
import { UsersService } from 'src/user/services/users.service';
import { TrelloWebhookRepository } from 'src/trello/repositories/webhook.repository';
import {
  TrelloBoardsApiService,
  TrelloCardsApiService,
  TrelloWebhooksApiService,
} from '@trello/api';
import {
  BadRequestException,
  ForbiddenException,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import { trelloBoardMock } from 'src/trello/__mocks__/trello.stub';
import { UserSearchPathEnum } from 'src/user/enums/query.enum';
import { validateTrelloToken } from 'src/common/helpers/trello-tokens';
import { I18nKeys } from 'src/common/enums/i18n-keys.enum';
import { TrelloBoard } from 'src/trello/dto/board.dto';
import { Webhook } from 'src/trello/entities/webhook.entity';
import { User } from 'src/user/entities/user.entity';
import {
  createFilteredWebhookCopy,
  getUpdatedWebhookNotifications,
  initializeNotificationArrays,
  notificationProfiles,
} from 'src/common/helpers/trello-notifications';
import { CreateWebhookDto } from 'src/trello/dto/create-webhook.dto';
import { TrelloWebhookNotificationProfiles } from 'src/trello/enums/trello.actions.enum';
import {
  NotificationBooleansDto,
  NotificationCategoriesDto,
  UpdateManyNotificationsDto,
  UpdateNotificationsDto,
} from 'src/trello/dto/notifications.dto';
import { UserRoles } from 'src/user/enums/role.enum';

jest.mock('src/common/helpers/hashing', () => ({
  hashPassword: jest.fn(),
  encryptText: jest.fn(),
  decryptText: jest.fn(),
}));

jest.mock('src/common/helpers/trello-tokens.ts', () => ({
  validateTrelloToken: jest.fn(),
}));

describe('TrelloWebhooksLogicService', () => {
  let originalDate = Date;

  let trelloWebhooksLogicService: TrelloWebhooksLogicService;
  let trelloWebhookRepository: TrelloWebhookRepository;
  let trelloMembersLogicService: TrelloMembersLogicService;
  let trelloTokensLogicService: TrelloTokensLogicService;
  let trelloBoardsApiService: TrelloBoardsApiService;
  let trelloWebhookApiService: TrelloWebhooksApiService;
  let usersService: UsersService;
  let usersRepository: UsersRepository;

  let telegramService: TelegramService;

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
        TrelloWebhooksLogicService,
        {
          provide: TrelloWebhookRepository,
          useValue: createMock<TrelloWebhookRepository>(),
        },
        {
          provide: TrelloActionsLogicService,
          useValue: createMock<TrelloActionsLogicService>(),
        },
        { provide: UsersService, useValue: createMock<UsersService>() },
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
          provide: TrelloWebhooksApiService,
          useValue: createMock<TrelloWebhooksApiService>(),
        },
        {
          provide: TrelloBoardsApiService,
          useValue: createMock<TrelloBoardsApiService>(),
        },
        {
          provide: TrelloCardsApiService,
          useValue: createMock<TrelloCardsApiService>(),
        },
        { provide: TelegramService, useValue: createMock<TelegramService>() },
      ],
    }).compile();

    trelloWebhooksLogicService = moduleRef.get<TrelloWebhooksLogicService>(
      TrelloWebhooksLogicService,
    );
    trelloWebhookRepository = moduleRef.get<TrelloWebhookRepository>(
      TrelloWebhookRepository,
    );
    trelloMembersLogicService = moduleRef.get<TrelloMembersLogicService>(
      TrelloMembersLogicService,
    );
    trelloTokensLogicService = moduleRef.get<TrelloTokensLogicService>(
      TrelloTokensLogicService,
    );
    trelloBoardsApiService = moduleRef.get<TrelloBoardsApiService>(
      TrelloBoardsApiService,
    );
    trelloWebhookApiService = moduleRef.get<TrelloWebhooksApiService>(
      TrelloWebhooksApiService,
    );

    telegramService = moduleRef.get<TelegramService>(TelegramService);
    usersService = moduleRef.get<UsersService>(UsersService);
    usersRepository = moduleRef.get<UsersRepository>(UsersRepository);

    (encryptText as jest.Mock).mockImplementation((text: string) => {
      return text.includes('encrypted') ? text : `encrypted${text}`; // ✅ Avoid double encryption
    });

    (decryptText as jest.Mock).mockImplementation((text: string) => {
      return text.replace('encrypted', ''); // ✅ Strip only one level of encryption
    });

    (validateTrelloToken as jest.Mock).mockImplementation(() => {});

    jest.spyOn(usersService, 'getUser').mockResolvedValue(userStub());

    jest
      .spyOn(trelloWebhooksLogicService, 'getWebhook')
      .mockResolvedValue(webhookStub);

    Object.defineProperty(trelloWebhooksLogicService, 'webhookCallbackURL', {
      value: 'https://mycallback.url',
      writable: true,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.resetAllMocks();
    global.Date = originalDate;
  });

  describe('getWebhook', () => {
    it('should not call findWebhookById if the webhook is already a Webhook instance', async () => {
      const webhookToFind = { ...webhookStub };
      const findWebhookByIdSpy = jest.spyOn(
        trelloWebhooksLogicService,
        'findWebhookById',
      );
      const result = await trelloWebhooksLogicService.getWebhook(webhookToFind);

      expect(findWebhookByIdSpy).not.toHaveBeenCalled();
      expect(result).toEqual(webhookToFind);
    });

    it('should call findWebhookById if the webhook is a string', async () => {
      const webhookId = webhookStub.id;

      const findWebhookByIdSpy = jest
        .spyOn(trelloWebhooksLogicService, 'findWebhookById')
        .mockResolvedValue({ ...webhookStub });

      const result = await trelloWebhooksLogicService.findWebhookById(
        webhookId,
        undefined,
      );

      expect(findWebhookByIdSpy).toHaveBeenCalledWith(webhookId, undefined);

      expect(result).toEqual({ ...webhookStub });
    });
  });

  describe('findWebhookById', () => {
    it('should return the webhook if it exists and board name has not changed', async () => {
      const webhook = { ...webhookStub };
      const decryptedAuthorToken = webhook.author.trelloToken.replace(
        'encrypted',
        '',
      );

      jest
        .spyOn(trelloWebhookRepository, 'findOneById')
        .mockResolvedValue({ ...webhookStub });

      jest
        .spyOn(trelloBoardsApiService, 'fetchBoardById')
        .mockResolvedValue({ ...trelloBoardMock });

      const result = await trelloWebhooksLogicService.findWebhookById(
        webhook.id,
      );

      expect(trelloWebhookRepository.findOneById).toHaveBeenCalledWith(
        webhook.id,
      );

      expect(trelloBoardsApiService.fetchBoardById).toHaveBeenCalledWith(
        decryptedAuthorToken,
        webhook.idModel,
      );

      expect(webhook.boardName).toEqual(trelloBoardMock.name);
      expect(result).toEqual(webhook);
    });

    it('should update webhook properties if board name was changed', async () => {
      const webhook = { ...webhookStub };

      const boardMock = {
        ...trelloBoardMock,
        name: 'otherBoardName',
        url: `${trelloBoardMock.shortUrl}/otherBoardName`,
      };

      const updatedWebhook = {
        ...webhook,
        boardName: boardMock.name,
        boardUrl: boardMock.url,
      };

      const userMock = userStub();

      const decryptedAuthorToken = webhook.author.trelloToken.replace(
        'encrypted',
        '',
      );

      jest
        .spyOn(trelloWebhookRepository, 'findOneById')
        .mockResolvedValue(webhook);

      jest
        .spyOn(trelloBoardsApiService, 'fetchBoardById')
        .mockResolvedValue(boardMock);

      jest
        .spyOn(trelloWebhookRepository, 'updateById')
        .mockResolvedValue(updatedWebhook);

      jest
        .spyOn(usersService, 'findUsersConnectedToWebhook')
        .mockResolvedValue([userMock]);

      const updateManyUsersSpy = jest
        .spyOn(usersService, 'updateManyUsers')
        .mockResolvedValue(undefined);

      const result = await trelloWebhooksLogicService.findWebhookById(
        webhook.id,
      );

      expect(trelloWebhookRepository.findOneById).toHaveBeenCalledWith(
        webhook.id,
      );

      expect(trelloBoardsApiService.fetchBoardById).toHaveBeenCalledWith(
        decryptedAuthorToken,
        webhook.idModel,
      );

      expect(trelloWebhookRepository.updateById).toHaveBeenCalledWith(
        webhook.id,
        {
          boardName: boardMock.name,
          boardUrl: boardMock.url,
        },
      );

      expect(usersService.findUsersConnectedToWebhook).toHaveBeenCalledWith(
        updatedWebhook.id,
      );
      const updateCalls = updateManyUsersSpy.mock.calls[0][0];

      expect(updateCalls).toEqual([
        {
          updateOne: {
            filter: { id: userMock.id },
            update: {
              $set: {
                [UserSearchPathEnum.TrelloWebhooks]: expect.arrayContaining([
                  expect.objectContaining({
                    webhookId: webhook.id,
                    idModel: boardMock.id,
                    modelName: boardMock.name,
                  }),
                ]),
              },
            },
          },
        },
      ]);

      expect(usersService.updateManyUsers).toHaveBeenCalledTimes(1);

      expect(result).toEqual(updatedWebhook);
    });

    it('should throw NotFoundException if webhook does not exist', async () => {
      jest
        .spyOn(trelloWebhookRepository, 'findOneById')
        .mockResolvedValue(null);

      await expect(
        trelloWebhooksLogicService.findWebhookById('non-existent-id'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findWebhookByBoardId', () => {
    it('should return webhook', async () => {
      const webhook = { ...webhookStub };
      const boardId = webhook.idModel;

      jest
        .spyOn(trelloWebhookRepository, 'findOneByBoardId')
        .mockResolvedValue(webhook);

      const result =
        await trelloWebhooksLogicService.findWebhookByBoardId(boardId);

      expect(trelloWebhookRepository.findOneByBoardId).toHaveBeenCalledWith(
        boardId,
      );

      expect(result).toEqual(webhook);
    });

    it('should throw NotFoundException if webhook does not exist', async () => {
      jest
        .spyOn(trelloWebhookRepository, 'findOneByBoardId')
        .mockResolvedValue(null);

      await expect(
        trelloWebhooksLogicService.findWebhookByBoardId('non-existent-id'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAllWebhoks', () => {
    it('should return all webhooks', async () => {
      const allWebhooks = [{ ...webhookStub }];
      jest
        .spyOn(trelloWebhookRepository, 'findAll')
        .mockResolvedValue(allWebhooks);

      const result = await trelloWebhooksLogicService.findAllWebhooks();

      expect(result).toEqual(allWebhooks);
    });
  });

  describe('findMemberConnectedWebhooks', () => {
    it('should return member subscribed webhooks', async () => {
      const requestedUser = userStub();

      const webhooks = [
        {
          ...webhookStub,
        },
        {
          ...webhookStub,
          id: requestedUser.trello.webhooks[1].webhookId,
          boardName: requestedUser.trello.webhooks[1].modelName,
          idModel: requestedUser.trello.webhooks[1].idModel,
        },
      ];

      jest
        .spyOn(trelloWebhookRepository, 'findWebhooksConnectedToUser')
        .mockResolvedValue(webhooks);

      const result =
        await trelloWebhooksLogicService.findMemberConnectedWebhooks(
          requestedUser.id,
        );

      expect(usersService.getUser).toHaveBeenCalledWith(
        requestedUser.id,
        undefined,
      );

      expect(validateTrelloToken).toHaveBeenCalledWith(
        requestedUser.trello.token,
        undefined,
      );

      expect(result).toHaveLength(webhooks.length);
      expect(result).toEqual(webhooks);
    });

    it('should throw an error if Trello token is invalid', async () => {
      const requestedUser = userStub();
      requestedUser.trello.token = null;

      jest.spyOn(usersService, 'getUser').mockResolvedValue(requestedUser);

      (validateTrelloToken as jest.Mock).mockImplementation(() => {
        throw new BadRequestException();
      });

      await expect(
        trelloWebhooksLogicService.findMemberConnectedWebhooks(
          requestedUser.id,
        ),
      ).rejects.toThrow(BadRequestException);

      expect(validateTrelloToken).toHaveBeenCalledWith(
        requestedUser.trello.token,
        undefined,
      );

      expect(
        trelloWebhookRepository.findWebhooksConnectedToUser,
      ).not.toHaveBeenCalled();
    });
  });

  describe('findMemberCreatedWebhooks', () => {
    it('should return member created webhooks', async () => {
      const requestedUser = userStub();

      const webhooks = [
        {
          ...webhookStub,
        },
      ];

      jest
        .spyOn(trelloWebhookRepository, 'findWebhooksCreatedByUser')
        .mockResolvedValue(webhooks);

      const result = await trelloWebhooksLogicService.findMemberCreatedWebhooks(
        requestedUser.id,
      );

      expect(usersService.getUser).toHaveBeenCalledWith(
        requestedUser.id,
        undefined,
      );

      expect(validateTrelloToken).toHaveBeenCalledWith(
        requestedUser.trello.token,
        undefined,
      );

      expect(result).toHaveLength(webhooks.length);
      expect(result).toEqual(webhooks);
    });

    it('should throw an error if Trello token is invalid', async () => {
      const requestedUser = {
        ...userStub(),
        trello: {
          ...userStub().trello,
          token: null,
        },
      };
      requestedUser.trello.token = null;

      jest.spyOn(usersService, 'getUser').mockResolvedValue(requestedUser);

      (validateTrelloToken as jest.Mock).mockImplementation(() => {
        throw new BadRequestException();
      });

      await expect(
        trelloWebhooksLogicService.findMemberCreatedWebhooks(requestedUser.id),
      ).rejects.toThrow(BadRequestException);

      expect(validateTrelloToken).toHaveBeenCalledWith(
        requestedUser.trello.token,
        undefined,
      );

      expect(
        trelloWebhookRepository.findWebhooksCreatedByUser,
      ).not.toHaveBeenCalled();
    });
  });

  describe('recreateWebhookIfUnavailable', () => {
    let requestedUser: User;
    let webhookSubscribers: User[];
    let existingWebhook: Webhook;
    let trelloBoard: TrelloBoard;
    let newWebhook: Webhook;

    beforeEach(() => {
      requestedUser = userStub();
      existingWebhook = webhookStub;
      trelloBoard = trelloBoardMock;
      webhookSubscribers = [userStub(), superAdminStub()];

      newWebhook = {
        ...createFilteredWebhookCopy(existingWebhook),
        id: 'newWebhookId',
        author: {
          trelloUserId: requestedUser.trello.userId,
          trelloToken: requestedUser.trello.token,
        },
      };

      delete newWebhook.createdAt;
      delete newWebhook.updatedAt;

      jest
        .spyOn(trelloWebhooksLogicService, 'getWebhook')
        .mockResolvedValue(existingWebhook);
      jest.spyOn(usersService, 'getUser').mockResolvedValue(requestedUser);
      jest
        .spyOn(trelloBoardsApiService, 'fetchBoardById')
        .mockResolvedValue(trelloBoard);
      jest
        .spyOn(trelloTokensLogicService, 'isTokenInfinite')
        .mockResolvedValue(true);
      jest
        .spyOn(trelloWebhookApiService, 'getWebhooksByToken')
        .mockResolvedValue([existingWebhook]);
      jest
        .spyOn(trelloWebhookApiService, 'createWebhook')
        .mockResolvedValue(newWebhook);
      jest
        .spyOn(trelloWebhookRepository, 'deleteById')
        .mockResolvedValue(undefined);
      jest
        .spyOn(trelloWebhookRepository, 'create')
        .mockResolvedValue(newWebhook);
      jest
        .spyOn(usersService, 'findUsersConnectedToWebhook')
        .mockResolvedValue([userStub(), superAdminStub()]);
      jest.spyOn(usersService, 'updateUser').mockResolvedValue(undefined);
    });

    it('should return the existing webhook if it is still active', async () => {
      const result =
        await trelloWebhooksLogicService.recreateWebhookIfUnavailable(
          existingWebhook,
          requestedUser,
        );

      expect(trelloWebhooksLogicService.getWebhook).toHaveBeenCalledWith(
        existingWebhook,
        undefined,
      );
      expect(usersService.getUser).toHaveBeenCalledWith(
        requestedUser,
        undefined,
      );
      expect(trelloWebhookApiService.getWebhooksByToken).toHaveBeenCalledWith(
        expect.any(String),
        undefined,
      );

      expect(trelloWebhookRepository.deleteById).not.toHaveBeenCalled();
      expect(trelloWebhookApiService.createWebhook).not.toHaveBeenCalled();

      expect(result).toEqual(existingWebhook);
    });

    it('should recreate the webhook if Trello API returns an invalid token error', async () => {
      const decryptedAuthorToken = webhookStub.author.trelloToken.replace(
        'encrypted',
        '',
      );

      const decryptedUserToken = requestedUser.trello.token.replace(
        'encrypted',
        '',
      );

      jest
        .spyOn(trelloTokensLogicService, 'isTokenInfinite')
        .mockRejectedValue(new Error(I18nKeys.ERRORS_TRELLO_INVALID_APP_KEY));

      jest
        .spyOn(trelloWebhookApiService, 'createWebhook')
        .mockResolvedValue(newWebhook);

      jest
        .spyOn(trelloWebhookRepository, 'create')
        .mockResolvedValue(newWebhook);

      const result =
        await trelloWebhooksLogicService.recreateWebhookIfUnavailable(
          existingWebhook,
          requestedUser,
        );

      expect(trelloTokensLogicService.isTokenInfinite).toHaveBeenCalledWith(
        decryptedAuthorToken,
        undefined,
      );
      expect(trelloWebhookApiService.getWebhooksByToken).not.toHaveBeenCalled();

      expect(trelloWebhookApiService.createWebhook).toHaveBeenCalledWith(
        decryptedUserToken,
        `${(trelloWebhooksLogicService as any).webhookCallbackURL}/${existingWebhook.idModel}`,
        existingWebhook.idModel,
        undefined,
      );

      expect(trelloWebhookRepository.create).toHaveBeenCalledWith({
        ...newWebhook,
      });

      expect(result).toEqual(newWebhook);
    });

    it('should recreate the webhook and update all subscribers', async () => {
      const decryptedAuthorToken = webhookStub.author.trelloToken.replace(
        'encrypted',
        '',
      );

      const decryptedUserToken = requestedUser.trello.token.replace(
        'encrypted',
        '',
      );

      jest
        .spyOn(trelloWebhookApiService, 'getWebhooksByToken')
        .mockResolvedValue([]);

      const subscribersWithoutOldAuthor = webhookSubscribers.filter(
        (subscriber) =>
          subscriber.trello.userId !== existingWebhook.author.trelloUserId,
      );

      const updatedSubscribersWebhooks = subscribersWithoutOldAuthor.map(
        (subscriber) => {
          return {
            ...subscriber,
            trello: {
              ...subscriber.trello,
              webhooks: subscriber.trello.webhooks.map((userWebhook) => {
                if (userWebhook.webhookId === existingWebhook.id) {
                  return {
                    ...userWebhook,
                    webhookId: newWebhook.id,
                    idModel: newWebhook.idModel,
                    modelName: newWebhook.boardName,
                  };
                }
                return userWebhook;
              }),
            },
          };
        },
      );

      const updateManyOperations = updatedSubscribersWebhooks.map(
        (subscriber) => ({
          updateOne: {
            filter: { id: subscriber.id },
            update: {
              $set: {
                [UserSearchPathEnum.TrelloWebhooks]: subscriber.trello.webhooks,
              },
            },
          },
        }),
      );

      const result =
        await trelloWebhooksLogicService.recreateWebhookIfUnavailable(
          existingWebhook,
          requestedUser,
          undefined,
          trelloBoard,
        );

      expect(trelloTokensLogicService.isTokenInfinite).toHaveBeenCalledWith(
        decryptedAuthorToken,
        undefined,
      );
      expect(trelloWebhookApiService.getWebhooksByToken).toHaveBeenCalledWith(
        decryptedAuthorToken,
        undefined,
      );

      expect(trelloWebhookApiService.createWebhook).toHaveBeenCalledWith(
        decryptedUserToken,
        `${(trelloWebhooksLogicService as any).webhookCallbackURL}/${existingWebhook.idModel}`,
        trelloBoard.id,
        undefined,
      );

      expect(trelloWebhookRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'newWebhookId',
          boardName: trelloBoard.name,
          boardUrl: trelloBoard.url,
        }),
      );

      expect(usersService.findUsersConnectedToWebhook).toHaveBeenCalledWith(
        existingWebhook.id,
      );

      expect(trelloWebhookRepository.deleteById).toHaveBeenCalledWith(
        existingWebhook.id,
      );

      expect(usersService.updateManyUsers).toHaveBeenCalledWith(
        updateManyOperations,
      );

      expect(result).toEqual(newWebhook);
    });
  });

  describe('webhookHealthCheck', () => {
    let webhookStubData: Webhook;
    let recreatedWebhook: Webhook;
    let userStubData: User;

    beforeEach(() => {
      webhookStubData = { ...webhookStub };
      recreatedWebhook = { ...webhookStub, id: 'newWebhookId' };
      userStubData = { ...userStub() };
    });

    it('should call recreate webhook function if it is not available', async () => {
      jest
        .spyOn(trelloWebhooksLogicService, 'getWebhook')
        .mockResolvedValue(webhookStubData);

      jest
        .spyOn(trelloWebhooksLogicService, 'recreateWebhookIfUnavailable')
        .mockResolvedValue(recreatedWebhook);

      const result = await trelloWebhooksLogicService.webhookHealthCheck(
        webhookStubData.id,
        userStubData.id,
      );

      expect(
        trelloWebhooksLogicService.recreateWebhookIfUnavailable,
      ).toHaveBeenCalledWith(webhookStubData.id, userStubData.id, undefined);

      expect(result).toEqual({
        message: `Webhook for board ${webhookStubData.boardName} has been recreated`,
        statusCode: HttpStatus.OK,
        data: recreatedWebhook,
      });
    });

    it('should return the existing webhook if it is still available', async () => {
      jest
        .spyOn(trelloWebhooksLogicService, 'getWebhook')
        .mockResolvedValue(webhookStubData);

      jest
        .spyOn(trelloWebhooksLogicService, 'recreateWebhookIfUnavailable')
        .mockResolvedValue(webhookStubData);

      const result = await trelloWebhooksLogicService.webhookHealthCheck(
        webhookStubData.id,
        userStubData.id,
      );

      expect(
        trelloWebhooksLogicService.recreateWebhookIfUnavailable,
      ).toHaveBeenCalledWith(webhookStubData.id, userStubData.id, undefined);

      expect(result).toEqual({
        message: `Webhook for board ${webhookStubData.boardName} health is ok`,
        statusCode: HttpStatus.OK,
        data: webhookStubData,
      });
    });
  });

  describe('getWebhooksByCreatorToken', () => {
    it('should return webhooks created by trello token', async () => {
      jest
        .spyOn(trelloWebhookApiService, 'getWebhooksByToken')
        .mockResolvedValue([webhookStub]);

      const decryptedAuthorToken = webhookStub.author.trelloToken.replace(
        'encrypted',
        '',
      );

      const result =
        await trelloWebhooksLogicService.getWebhooksByCreatorToken(
          decryptedAuthorToken,
        );

      expect(result).toEqual([webhookStub]);
    });

    it('should throw BadRequestException if Trello API request fails', async () => {
      const decryptedAuthorToken = webhookStub.author.trelloToken.replace(
        'encrypted',
        '',
      );

      jest
        .spyOn(trelloWebhookApiService, 'getWebhooksByToken')
        .mockRejectedValue(new BadRequestException());

      await expect(
        trelloWebhooksLogicService.getWebhooksByCreatorToken(
          decryptedAuthorToken,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('createTrelloWebhook', () => {
    let userStubData: User;
    let webhookStubData: Webhook;
    let trelloBoardMockData: TrelloBoard;
    let createdWebhook: Webhook;
    let createWebhookDto: CreateWebhookDto;
    let trelloApiWebhookData: any;

    beforeEach(() => {
      userStubData = { ...userStub() };
      webhookStubData = { ...newWebhookStub };
      trelloBoardMockData = { ...trelloBoardMock };

      createWebhookDto = { boardId: trelloBoardMockData.id };

      createdWebhook = {
        ...webhookStubData,
        id: 'newWebhookId',
        boardName: trelloBoardMockData.name,
        boardUrl: trelloBoardMockData.url,
        author: {
          trelloToken: userStubData.trello.token,
          trelloUserId: userStubData.trello.userId,
        },
        subscribers: [
          {
            trelloUserId: userStubData.trello.userId,
            trelloToken: userStubData.trello.token,
            notificationProfile: TrelloWebhookNotificationProfiles.BASIC,
          },
        ],
        notifications: initializeNotificationArrays(userStubData.trello.userId),
      };

      trelloApiWebhookData = {
        active: true,
        callbackURL: createdWebhook.callbackURL,
        consecutiveFailures: 0,
        description: '',
        firstConsecutiveFailDate: null,
        id: createdWebhook.id,
        idModel: createdWebhook.idModel,
      };
    });

    it('should create a new webhook if none exists', async () => {
      const decryptedAuthorToken = userStubData.trello.token.replace(
        'encrypted',
        '',
      );

      const updatedTrelloProps = {
        trello: {
          ...userStubData.trello,
          webhooks: [
            ...userStubData.trello.webhooks,
            {
              idModel: createdWebhook.idModel,
              webhookId: createdWebhook.id,
              modelName: createdWebhook.boardName,
            },
          ],
        },
      };
      const updatedUser = {
        ...userStubData,
        updatedTrelloProps,
      };

      jest
        .spyOn(trelloWebhookRepository, 'findOneByBoardId')
        .mockResolvedValue(null);

      jest.spyOn(usersService, 'getUser').mockResolvedValue(userStubData);

      jest
        .spyOn(trelloBoardsApiService, 'fetchBoardById')
        .mockResolvedValue(trelloBoardMockData);

      jest
        .spyOn(trelloWebhookApiService, 'createWebhook')
        .mockResolvedValue(trelloApiWebhookData);

      jest.spyOn(usersService, 'updateUser').mockResolvedValue({
        message: expect.any(String),
        statusCode: HttpStatus.OK,
        data: updatedUser,
      });

      jest
        .spyOn(trelloWebhookRepository, 'create')
        .mockResolvedValue(createdWebhook);

      jest
        .spyOn(telegramService, 'sendMessageToUser')
        .mockResolvedValue(undefined);

      const result = await trelloWebhooksLogicService.createTrelloWebhook(
        userStubData,
        createWebhookDto,
      );

      expect(trelloWebhookApiService.createWebhook).toHaveBeenCalledWith(
        decryptedAuthorToken,
        `${(trelloWebhooksLogicService as any).webhookCallbackURL}/${createWebhookDto.boardId}`,
        createWebhookDto.boardId,
        undefined,
      );

      expect(trelloWebhookRepository.create).toHaveBeenCalledWith(
        createdWebhook,
      );

      expect(usersService.updateUser).toHaveBeenCalledWith(
        userStubData,
        updatedTrelloProps,
        undefined,
      );

      expect(result).toEqual({
        message: 'Webhook created successfully',
        statusCode: HttpStatus.OK,
        data: createdWebhook,
      });
    });

    it('should return an existing webhook and add the user as a subscriber if not already subscribed', async () => {
      const userToConnect = {
        ...userStubData,
        trello: {
          ...userStubData.trello,
          webhooks: [],
        },
      };

      const updatedTrelloProps = {
        trello: {
          ...userStubData.trello,
          webhooks: [
            {
              idModel: webhookStubData.idModel,
              webhookId: webhookStubData.id,
              modelName: webhookStubData.boardName,
            },
          ],
        },
      };

      const updatedUser = {
        ...userStubData,
        updatedTrelloProps,
      };

      jest
        .spyOn(trelloWebhookRepository, 'findOneByBoardId')
        .mockResolvedValue(webhookStubData);

      jest.spyOn(usersService, 'getUser').mockResolvedValue(userToConnect);

      jest
        .spyOn(trelloBoardsApiService, 'fetchBoardById')
        .mockResolvedValue(trelloBoardMockData);

      jest
        .spyOn(trelloWebhooksLogicService, 'recreateWebhookIfUnavailable')
        .mockResolvedValue(webhookStubData);

      jest.spyOn(usersService, 'updateUser').mockResolvedValue({
        message: '',
        statusCode: HttpStatus.OK,
        data: updatedUser,
      });

      jest
        .spyOn(trelloWebhookRepository, 'updateById')
        .mockResolvedValue(undefined);

      jest
        .spyOn(telegramService, 'sendMessageToUser')
        .mockResolvedValue(undefined);

      const result = await trelloWebhooksLogicService.createTrelloWebhook(
        userToConnect,
        createWebhookDto,
      );

      expect(trelloWebhookRepository.findOneByBoardId).toHaveBeenCalledWith(
        createWebhookDto.boardId,
      );

      expect(usersService.updateUser).toHaveBeenCalledWith(
        userToConnect,
        updatedTrelloProps,
        undefined,
      );

      expect(trelloWebhookRepository.create).not.toHaveBeenCalled();
      expect(trelloWebhookRepository.updateById).toHaveBeenCalled();

      expect(result).toEqual({
        message: `Webhook for board ${webhookStubData.boardName} exists, user ${userToConnect.id} added as a subscriber`,
        statusCode: HttpStatus.OK,
        data: webhookStubData,
      });
    });

    it('should throw a BadRequestException if webhook creation fails', async () => {
      jest
        .spyOn(trelloWebhookRepository, 'findOneByBoardId')
        .mockResolvedValue(null);

      jest.spyOn(usersService, 'getUser').mockResolvedValue(userStubData);

      jest
        .spyOn(trelloBoardsApiService, 'fetchBoardById')
        .mockResolvedValue(trelloBoardMockData);

      jest
        .spyOn(trelloWebhookApiService, 'createWebhook')
        .mockRejectedValue(new BadRequestException());

      await expect(
        trelloWebhooksLogicService.createTrelloWebhook(
          userStubData.id,
          createWebhookDto,
        ),
      ).rejects.toThrow(BadRequestException);

      expect(trelloWebhookApiService.createWebhook).toHaveBeenCalled();

      expect(trelloWebhookRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('updateTrelloWebhookNotifications', () => {
    let userStubData: User;
    let webhookStubData: Webhook;
    let updateWebhookNotificationsDto: UpdateNotificationsDto;
    let updatedWebhookNotifications: NotificationCategoriesDto;
    let basicNotificationProfile: NotificationBooleansDto;

    beforeEach(() => {
      userStubData = { ...userStub() };
      webhookStubData = { ...webhookStub };
      basicNotificationProfile = notificationProfiles.basic;

      updateWebhookNotificationsDto = {
        notifications: basicNotificationProfile,
        notificationProfile: TrelloWebhookNotificationProfiles.BASIC,
      };

      updatedWebhookNotifications = getUpdatedWebhookNotifications(
        userStubData.trello.userId,
        webhookStubData.notifications,
        updateWebhookNotificationsDto.notifications,
      );

      jest.spyOn(usersService, 'getUser').mockResolvedValue(userStubData);
      jest
        .spyOn(trelloWebhooksLogicService, 'getWebhook')
        .mockResolvedValue(webhookStubData);
      jest
        .spyOn(trelloWebhooksLogicService, 'recreateWebhookIfUnavailable')
        .mockResolvedValue(webhookStubData);
      jest.spyOn(trelloWebhookRepository, 'updateById').mockResolvedValue({
        ...webhookStubData,
        notifications: updatedWebhookNotifications,
      });
    });

    it('should successfully update webhook notifications', async () => {
      const result =
        await trelloWebhooksLogicService.updateTrelloWebhookNotifications(
          userStubData,
          webhookStubData,
          updateWebhookNotificationsDto,
        );

      expect(usersService.getUser).toHaveBeenCalledWith(
        userStubData,
        undefined,
      );

      expect(trelloWebhooksLogicService.getWebhook).toHaveBeenCalledWith(
        webhookStubData,
        undefined,
      );

      expect(
        trelloWebhooksLogicService.recreateWebhookIfUnavailable,
      ).toHaveBeenCalledWith(
        webhookStubData,
        userStubData,
        undefined,
        webhookStubData.idModel,
      );

      expect(trelloWebhookRepository.updateById).toHaveBeenCalledWith(
        webhookStubData.id,
        {
          notifications: updatedWebhookNotifications,
          subscribers: webhookStubData.subscribers,
        },
      );

      expect(result).toEqual({
        message: `Webhook ${webhookStubData.id} updated successfully`,
        statusCode: HttpStatus.OK,
        data: {
          ...webhookStubData,
          notifications: updatedWebhookNotifications,
        },
      });
    });

    it('should throw ForbiddenException if user is not subscribed to the webhook', async () => {
      webhookStubData.subscribers = [];

      await expect(
        trelloWebhooksLogicService.updateTrelloWebhookNotifications(
          userStubData,
          webhookStubData,
          updateWebhookNotificationsDto,
        ),
      ).rejects.toThrow(ForbiddenException);

      expect(trelloWebhookRepository.updateById).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if the webhook was recreated', async () => {
      const recreatedWebhook = { ...webhookStubData, id: 'newWebhookId' };

      jest
        .spyOn(trelloWebhooksLogicService, 'recreateWebhookIfUnavailable')
        .mockResolvedValue(recreatedWebhook);

      await expect(
        trelloWebhooksLogicService.updateTrelloWebhookNotifications(
          userStubData,
          webhookStubData,
          updateWebhookNotificationsDto,
        ),
      ).rejects.toThrow(BadRequestException);

      expect(trelloWebhookRepository.updateById).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if update fails', async () => {
      jest
        .spyOn(trelloWebhookRepository, 'updateById')
        .mockRejectedValue(new BadRequestException('Update failed'));

      await expect(
        trelloWebhooksLogicService.updateTrelloWebhookNotifications(
          userStubData,
          webhookStubData,
          updateWebhookNotificationsDto,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('updateManyTrelloWebhookNotifications', () => {
    let userStubData: User;
    let webhooksToUpdateStubData: Webhook[];
    let updateManyWebhooksDto: UpdateManyNotificationsDto;
    let basicNotificationProfile: NotificationBooleansDto;

    beforeEach(() => {
      userStubData = { ...userStub() };

      webhooksToUpdateStubData = [
        { ...webhookStub, boardName: 'board1' },
        { ...webhookStub, boardName: 'board2' },
      ];

      basicNotificationProfile = notificationProfiles.basic;

      updateManyWebhooksDto = {
        notifications: basicNotificationProfile,
        notificationProfile: TrelloWebhookNotificationProfiles.BASIC,
        webhooks: [
          webhooksToUpdateStubData[0].id,
          webhooksToUpdateStubData[1].id,
        ],
      };

      jest.spyOn(usersService, 'getUser').mockResolvedValue(userStubData);
      jest
        .spyOn(trelloWebhookRepository, 'findManyByIds')
        .mockResolvedValue(webhooksToUpdateStubData);
    });

    it('should update multiple webhooks successfully', async () => {
      jest
        .spyOn(trelloWebhooksLogicService, 'recreateWebhookIfUnavailable')
        .mockResolvedValueOnce(webhooksToUpdateStubData[0])
        .mockResolvedValueOnce(webhooksToUpdateStubData[1]);

      jest.spyOn(trelloWebhookRepository, 'updateById').mockResolvedValue(null);

      const result =
        await trelloWebhooksLogicService.updateManyTrelloWebhookNotifications(
          userStubData,
          updateManyWebhooksDto,
        );

      expect(usersService.getUser).toHaveBeenCalledWith(
        userStubData,
        undefined,
      );
      expect(trelloWebhookRepository.findManyByIds).toHaveBeenCalledWith(
        updateManyWebhooksDto.webhooks,
      );
      expect(
        trelloWebhooksLogicService.recreateWebhookIfUnavailable,
      ).toHaveBeenCalledTimes(webhooksToUpdateStubData.length);
      expect(trelloWebhookRepository.updateById).toHaveBeenCalledTimes(
        webhooksToUpdateStubData.length,
      );

      expect(result).toEqual({
        message: 'Webhooks has been updated successfully',
        statusCode: HttpStatus.OK,
      });
    });

    it('should return failed webhook names if all updates fail', async () => {
      jest
        .spyOn(trelloWebhooksLogicService, 'recreateWebhookIfUnavailable')
        .mockResolvedValueOnce(webhooksToUpdateStubData[0])
        .mockResolvedValueOnce(webhooksToUpdateStubData[1]);

      jest
        .spyOn(trelloWebhookRepository, 'updateById')
        .mockRejectedValueOnce(new BadRequestException('Update failed'))
        .mockRejectedValueOnce(new BadRequestException('Update failed'));

      const failedWebhookNames = webhooksToUpdateStubData
        .map((webhook) => webhook.boardName)
        .join(', ');

      const result =
        await trelloWebhooksLogicService.updateManyTrelloWebhookNotifications(
          userStubData,
          updateManyWebhooksDto,
        );

      expect(result).toEqual({
        message: `Webhooks ${failedWebhookNames} failed to update`,
        statusCode: HttpStatus.OK,
      });
    });

    it('should throw ForbiddenException if the user is not a subscriber', async () => {
      jest.spyOn(trelloWebhookRepository, 'findManyByIds').mockResolvedValue(
        webhooksToUpdateStubData.map((webhook) => ({
          ...webhook,
          subscribers: [],
        })),
      );

      await expect(
        trelloWebhooksLogicService.updateManyTrelloWebhookNotifications(
          userStubData,
          updateManyWebhooksDto,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException if a webhook was recreated', async () => {
      const recreatedWebhook = {
        ...webhooksToUpdateStubData[0],
        id: 'newWebhookId',
      };

      jest
        .spyOn(trelloWebhooksLogicService, 'recreateWebhookIfUnavailable')
        .mockResolvedValue(recreatedWebhook);

      await expect(
        trelloWebhooksLogicService.updateManyTrelloWebhookNotifications(
          userStubData,
          updateManyWebhooksDto,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('removeTrelloWebhook', () => {
    let webhookStubData: Webhook;
    let decryptedToken: string;

    beforeEach(() => {
      webhookStubData = { ...webhookStub, id: 'webhook1' };
      decryptedToken = webhookStub.author.trelloToken.replace('encrypted', '');

      jest
        .spyOn(trelloWebhooksLogicService, 'getWebhook')
        .mockResolvedValue(webhookStubData);
    });

    it('should remove a webhook successfully', async () => {
      jest
        .spyOn(trelloWebhookApiService, 'deleteWebhook')
        .mockResolvedValue(null);
      jest
        .spyOn(usersService, 'removeWebhookFromAllUsers')
        .mockResolvedValue(null);
      jest.spyOn(trelloWebhookRepository, 'deleteById').mockResolvedValue(null);

      const result =
        await trelloWebhooksLogicService.removeTrelloWebhook(webhookStubData);

      expect(trelloWebhooksLogicService.getWebhook).toHaveBeenCalledWith(
        webhookStubData,
        undefined,
      );

      expect(trelloWebhookApiService.deleteWebhook).toHaveBeenCalledWith(
        decryptedToken,
        webhookStubData.id,
      );

      expect(usersService.removeWebhookFromAllUsers).toHaveBeenCalledWith(
        webhookStubData,
        undefined,
      );

      expect(trelloWebhookRepository.deleteById).toHaveBeenCalledWith(
        webhookStubData.id,
      );

      expect(result).toEqual({
        message: `Webhook ${webhookStubData.id} deleted successfully from Trello and all connected users`,
        statusCode: HttpStatus.OK,
      });
    });

    it('should log a warning if Trello API webhook deletion fails but continue deletion', async () => {
      jest
        .spyOn(trelloWebhookApiService, 'deleteWebhook')
        .mockRejectedValue(new Error('Trello API error'));

      jest
        .spyOn(usersService, 'removeWebhookFromAllUsers')
        .mockResolvedValue(null);
      jest.spyOn(trelloWebhookRepository, 'deleteById').mockResolvedValue(null);

      const result =
        await trelloWebhooksLogicService.removeTrelloWebhook(webhookStubData);

      expect(trelloWebhookApiService.deleteWebhook).toHaveBeenCalledWith(
        decryptedToken,
        webhookStubData.id,
      );
      expect(usersService.removeWebhookFromAllUsers).toHaveBeenCalled();
      expect(trelloWebhookRepository.deleteById).toHaveBeenCalled();

      expect(result).toEqual({
        message: `Webhook ${webhookStubData.id} deleted successfully from Trello and all connected users`,
        statusCode: HttpStatus.OK,
      });
    });

    it('should throw BadRequestException if user webhook removal or repository deletion fails', async () => {
      jest
        .spyOn(trelloWebhookApiService, 'deleteWebhook')
        .mockResolvedValue(null);
      jest
        .spyOn(usersService, 'removeWebhookFromAllUsers')
        .mockRejectedValue(
          new BadRequestException('User webhook removal failed'),
        );

      await expect(
        trelloWebhooksLogicService.removeTrelloWebhook(webhookStubData),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('removeAllWebhooksCreatedByUser', () => {
    let userStubData: User;
    let webhooksStubData: Webhook[];

    beforeEach(() => {
      userStubData = { ...userStub() };

      webhooksStubData = [
        {
          ...webhookStub,
          id: 'webhook1',
          author: {
            trelloUserId: userStubData.trello.userId,
            trelloToken: userStubData.trello.token,
          },
        },
        {
          ...webhookStub,
          id: 'webhook2',
          author: {
            trelloUserId: userStubData.trello.userId,
            trelloToken: userStubData.trello.token,
          },
        },
      ];

      jest.spyOn(usersService, 'getUser').mockResolvedValue(userStubData);
    });

    it('should return a success message if no webhooks are found for the user', async () => {
      jest
        .spyOn(trelloWebhookRepository, 'findWebhooksCreatedByUser')
        .mockResolvedValue([]);

      jest.spyOn(trelloWebhooksLogicService, 'removeTrelloWebhook');

      const result =
        await trelloWebhooksLogicService.removeAllWebhooksCreatedByUser(
          userStubData,
        );

      expect(
        trelloWebhookRepository.findWebhooksCreatedByUser,
      ).toHaveBeenCalledWith(userStubData.trello.userId);

      expect(
        trelloWebhooksLogicService.removeTrelloWebhook,
      ).not.toHaveBeenCalled();

      expect(result).toEqual({
        message: `No webhooks found for user: ${userStubData.trello.userId}`,
        statusCode: HttpStatus.OK,
      });
    });

    it('should delete all webhooks created by the user successfully', async () => {
      jest
        .spyOn(trelloWebhookRepository, 'findWebhooksCreatedByUser')
        .mockResolvedValue(webhooksStubData);

      jest
        .spyOn(trelloWebhooksLogicService, 'removeTrelloWebhook')
        .mockResolvedValue(null);

      const result =
        await trelloWebhooksLogicService.removeAllWebhooksCreatedByUser(
          userStubData,
        );

      expect(
        trelloWebhookRepository.findWebhooksCreatedByUser,
      ).toHaveBeenCalledWith(userStubData.trello.userId);

      expect(
        trelloWebhooksLogicService.removeTrelloWebhook,
      ).toHaveBeenCalledTimes(webhooksStubData.length);

      expect(result).toEqual({
        message: `Removed ${webhooksStubData.length} webhooks created by user: ${userStubData.trello.userId}`,
        statusCode: HttpStatus.OK,
      });
    });

    it('should throw BadRequestException if webhook deletion fails', async () => {
      jest
        .spyOn(trelloWebhookRepository, 'findWebhooksCreatedByUser')
        .mockResolvedValue(webhooksStubData);

      jest
        .spyOn(trelloWebhooksLogicService, 'removeTrelloWebhook')
        .mockRejectedValue(new BadRequestException('Deletion failed'));

      await expect(
        trelloWebhooksLogicService.removeAllWebhooksCreatedByUser(userStubData),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('removeAllWebhooks', () => {
    let superAdminStubData: User;
    let webhookStubData: Webhook[];

    beforeEach(() => {
      superAdminStubData = { ...superAdminStub() };

      webhookStubData = [
        { ...webhookStub, id: 'webhook1' },
        { ...webhookStub, id: 'webhook2' },
      ];

      jest.spyOn(usersService, 'getUser').mockResolvedValue(superAdminStubData);
    });

    it('should throw ForbiddenException if the user is not a superadmin', async () => {
      const nonAdminUser = { ...userStub(), role: UserRoles.user };

      jest.spyOn(usersService, 'getUser').mockResolvedValue(nonAdminUser);

      await expect(
        trelloWebhooksLogicService.removeAllWebhooks(nonAdminUser),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should return a success message if no webhooks are found', async () => {
      jest
        .spyOn(trelloWebhooksLogicService, 'findAllWebhooks')
        .mockResolvedValue([]);

      const result =
        await trelloWebhooksLogicService.removeAllWebhooks(superAdminStubData);

      expect(result).toEqual({
        message: 'No webhooks to delete.',
        statusCode: HttpStatus.OK,
      });
    });

    it('should delete all webhooks successfully', async () => {
      jest
        .spyOn(trelloWebhooksLogicService, 'findAllWebhooks')
        .mockResolvedValue(webhookStubData);

      jest
        .spyOn(trelloWebhooksLogicService, 'removeTrelloWebhook')
        .mockResolvedValue(null);

      const result =
        await trelloWebhooksLogicService.removeAllWebhooks(superAdminStubData);

      expect(trelloWebhooksLogicService.findAllWebhooks).toHaveBeenCalled();
      expect(
        trelloWebhooksLogicService.removeTrelloWebhook,
      ).toHaveBeenCalledTimes(webhookStubData.length);

      expect(result).toEqual({
        message:
          'All webhooks deleted successfully from Trello and all connected users.',
        statusCode: HttpStatus.OK,
      });
    });

    it('should throw BadRequestException if webhook deletion fails', async () => {
      jest
        .spyOn(trelloWebhooksLogicService, 'findAllWebhooks')
        .mockResolvedValue(webhookStubData);

      jest
        .spyOn(trelloWebhooksLogicService, 'removeTrelloWebhook')
        .mockRejectedValue(new BadRequestException('Deletion failed'));

      await expect(
        trelloWebhooksLogicService.removeAllWebhooks(superAdminStubData),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
