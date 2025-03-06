import { Test } from '@nestjs/testing';
import { SharedConfigService } from 'src/config/shared.config.service';
import {
  TrelloActionsLogicService,
  TrelloMembersLogicService,
  TrelloTokensLogicService,
  TrelloWebhooksLogicService,
} from '@trello/logic';
import { NotificationBotService } from 'src/telegram/notification-bot/notification-bot.service';
import { createMock } from '@golevelup/ts-jest';
import { decryptText, encryptText } from 'src/common/helpers/hashing';

import {
  newWebhookStub,
  webhookActionStub,
  webhookStub,
} from 'src/trello/__mocks__/webhook.stub';
import { superAdminStub, userStub } from 'src/user/__mocks__/user.stub';
import { UsersRepository } from 'src/user/repositories/users.repository';
import { UsersService } from 'src/user/services/users.service';
import { TrelloWebhookRepository } from 'src/trello/repositories/webhook.repository';
import {
  TrelloBatchApiService,
  TrelloBoardsApiService,
  TrelloCardsApiService,
  TrelloWebhooksApiService,
} from '@trello/api';
import {
  BadRequestException,
  ForbiddenException,
  HttpStatus,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  trelloBoardMock,
  trelloCardMock,
} from 'src/trello/__mocks__/trello.stub';
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
import {
  TrelloWebhookActions,
  TrelloWebhookAdminActions,
  TrelloWebhookBoardActions,
  TrelloWebhookDetailedActions,
  TrelloWebhookNotificationProfiles,
  TrelloWebhookPersonalActions,
} from 'src/trello/enums/trello.actions.enum';
import {
  NotificationBooleansDto,
  NotificationCategoriesDto,
  UpdateManyNotificationsDto,
  UpdateNotificationsDto,
} from 'src/trello/dto/notifications.dto';
import { UserRoles } from 'src/user/enums/role.enum';
import { BoardMember } from 'src/trello/dto/member.dto';
import { I18nService } from 'nestjs-i18n';
import { ConfigService } from '@nestjs/config';

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
  let trelloTokensLogicService: TrelloTokensLogicService;
  let trelloBoardsApiService: TrelloBoardsApiService;
  let trelloCardsApiService: TrelloCardsApiService;
  let trelloWebhookApiService: TrelloWebhooksApiService;
  let trelloBatchApiService: TrelloBatchApiService;
  let trelloActionsService: TrelloActionsLogicService;
  let usersService: UsersService;
  let configService: ConfigService;
  let i18nService: I18nService;

  let notificationBotService: NotificationBotService;

  let userStubData: User;
  let webhookStubData: Webhook;
  let webhooksStubData: Webhook[];
  let superAdminStubData: User;

  const fixedDate = superAdminStub().telegram.updatedAt;

  beforeEach(async () => {
    originalDate = global.Date;
    global.Date = class extends originalDate {
      constructor() {
        super();
        return fixedDate;
      }
    } as unknown as DateConstructor;

    //disable any logging in tests
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'debug').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'verbose').mockImplementation(() => {});
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});

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
          provide: ConfigService,
          useValue: createMock<ConfigService>(),
        },
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
        {
          provide: TrelloBatchApiService,
          useValue: createMock<TrelloBatchApiService>(),
        },
        {
          provide: NotificationBotService,
          useValue: createMock<NotificationBotService>(),
        },
        { provide: I18nService, useValue: createMock<I18nService>() },
      ],
    }).compile();

    trelloWebhooksLogicService = moduleRef.get<TrelloWebhooksLogicService>(
      TrelloWebhooksLogicService,
    );

    trelloWebhookRepository = moduleRef.get<TrelloWebhookRepository>(
      TrelloWebhookRepository,
    );

    trelloTokensLogicService = moduleRef.get<TrelloTokensLogicService>(
      TrelloTokensLogicService,
    );

    trelloBoardsApiService = moduleRef.get<TrelloBoardsApiService>(
      TrelloBoardsApiService,
    );

    trelloCardsApiService = moduleRef.get<TrelloCardsApiService>(
      TrelloCardsApiService,
    );

    trelloWebhookApiService = moduleRef.get<TrelloWebhooksApiService>(
      TrelloWebhooksApiService,
    );

    trelloBatchApiService = moduleRef.get<TrelloBatchApiService>(
      TrelloBatchApiService,
    );

    trelloActionsService = moduleRef.get<TrelloActionsLogicService>(
      TrelloActionsLogicService,
    );

    notificationBotService = moduleRef.get<NotificationBotService>(
      NotificationBotService,
    );
    usersService = moduleRef.get<UsersService>(UsersService);
    configService = moduleRef.get<ConfigService>(ConfigService);
    i18nService = moduleRef.get<I18nService>(I18nService);

    userStubData = { ...userStub() };
    webhookStubData = { ...webhookStub };
    webhooksStubData = [{ ...webhookStub }, { ...newWebhookStub }];
    superAdminStubData = { ...superAdminStub() };

    (encryptText as jest.Mock).mockImplementation((text: string) => {
      return text.includes('encrypted') ? text : `encrypted${text}`; // ✅ Avoid double encryption
    });

    (decryptText as jest.Mock).mockImplementation((text: string) => {
      return text.replace('encrypted', ''); // ✅ Strip only one level of encryption
    });

    (validateTrelloToken as jest.Mock).mockImplementation(() => {});

    jest.spyOn(i18nService, 't').mockImplementation(() => {
      'translated message';
    });

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

  describe('findMyConnectedWebhooks', () => {
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

      const result = await trelloWebhooksLogicService.findMyConnectedWebhooks(
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
        trelloWebhooksLogicService.findMyConnectedWebhooks(requestedUser.id),
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

  describe('findMyCreatedWebhooks', () => {
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

      const result = await trelloWebhooksLogicService.findMyCreatedWebhooks(
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
        trelloWebhooksLogicService.findMyCreatedWebhooks(requestedUser.id),
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
          userId: requestedUser.id,
          email: requestedUser.email,
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
    let recreatedWebhook: Webhook;

    beforeEach(() => {
      recreatedWebhook = { ...webhookStub, id: 'newWebhookId' };
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
        message: expect.stringContaining(webhookStubData.boardName),
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
    let newWebhookStubData: Webhook;
    let trelloBoardMockData: TrelloBoard;
    let createdWebhook: Webhook;
    let createWebhookDto: CreateWebhookDto;
    let trelloApiWebhookData: any;

    beforeEach(() => {
      newWebhookStubData = { ...newWebhookStub };
      trelloBoardMockData = { ...trelloBoardMock };

      createWebhookDto = { boardId: trelloBoardMockData.id };

      createdWebhook = {
        ...newWebhookStubData,
        id: 'newWebhookId',
        boardName: trelloBoardMockData.name,
        boardUrl: trelloBoardMockData.url,
        author: {
          userId: userStubData.id,
          email: userStubData.email,
          trelloToken: userStubData.trello.token,
          trelloUserId: userStubData.trello.userId,
        },
        subscribers: [
          {
            userId: userStubData.id,
            email: userStubData.email,
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
        lastActivityDate: fixedDate,
      };
      const updatedUser = {
        ...userStubData,
        updatedTrelloProps,
      };

      jest
        .spyOn(trelloWebhookRepository, 'findOneByBoardId')
        .mockResolvedValue(null);

      jest.spyOn(usersService, 'getUser').mockResolvedValue(userStubData);

      jest.spyOn(configService, 'get').mockReturnValue('frontendlink');

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
        .spyOn(notificationBotService, 'sendMessageToUser')
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
        message: expect.any(String),
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
              idModel: newWebhookStubData.idModel,
              webhookId: newWebhookStubData.id,
              modelName: newWebhookStubData.boardName,
            },
          ],
        },
        lastActivityDate: fixedDate,
      };

      const updatedUser = {
        ...userStubData,
        updatedTrelloProps,
      };

      jest
        .spyOn(trelloWebhookRepository, 'findOneByBoardId')
        .mockResolvedValue(newWebhookStubData);

      jest.spyOn(usersService, 'getUser').mockResolvedValue(userToConnect);

      jest
        .spyOn(trelloBoardsApiService, 'fetchBoardById')
        .mockResolvedValue(trelloBoardMockData);

      jest
        .spyOn(trelloWebhooksLogicService, 'recreateWebhookIfUnavailable')
        .mockResolvedValue(newWebhookStubData);

      jest.spyOn(usersService, 'updateUser').mockResolvedValue({
        message: expect.stringContaining(updatedUser.id),
        statusCode: HttpStatus.OK,
        data: updatedUser,
      });

      jest
        .spyOn(trelloWebhookRepository, 'updateById')
        .mockResolvedValue(undefined);

      jest
        .spyOn(notificationBotService, 'sendMessageToUser')
        .mockResolvedValue(undefined);

      jest.spyOn(configService, 'get').mockReturnValue('frontendlink');

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
        message: `Webhook for board ${newWebhookStubData.boardName} exists, user ${userToConnect.id} added as a subscriber`,
        statusCode: HttpStatus.OK,
        data: newWebhookStubData,
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
    let updateWebhookNotificationsDto: UpdateNotificationsDto;
    let updatedWebhookNotifications: NotificationCategoriesDto;
    let basicNotificationProfile: NotificationBooleansDto;

    beforeEach(() => {
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
        message: expect.stringContaining(webhookStubData.id),
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
    let updateManyWebhooksDto: UpdateManyNotificationsDto;
    let basicNotificationProfile: NotificationBooleansDto;

    beforeEach(() => {
      basicNotificationProfile = notificationProfiles.basic;

      updateManyWebhooksDto = {
        notifications: basicNotificationProfile,
        notificationProfile: TrelloWebhookNotificationProfiles.BASIC,
        webhooks: [webhooksStubData[0].id, webhooksStubData[1].id],
      };

      jest.spyOn(usersService, 'getUser').mockResolvedValue(userStubData);
      jest
        .spyOn(trelloWebhookRepository, 'findManyByIds')
        .mockResolvedValue(webhooksStubData);
    });

    it('should update multiple webhooks successfully', async () => {
      jest
        .spyOn(trelloWebhooksLogicService, 'recreateWebhookIfUnavailable')
        .mockResolvedValueOnce(webhooksStubData[0])
        .mockResolvedValueOnce(webhooksStubData[1]);

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
      ).toHaveBeenCalledTimes(webhooksStubData.length);
      expect(trelloWebhookRepository.updateById).toHaveBeenCalledTimes(
        webhooksStubData.length,
      );

      expect(result).toEqual({
        message: expect.any(String),
        statusCode: HttpStatus.OK,
      });
    });

    it('should return failed webhook names if all updates fail', async () => {
      jest
        .spyOn(trelloWebhooksLogicService, 'recreateWebhookIfUnavailable')
        .mockResolvedValueOnce(webhooksStubData[0])
        .mockResolvedValueOnce(webhooksStubData[1]);

      jest
        .spyOn(trelloWebhookRepository, 'updateById')
        .mockRejectedValueOnce(new BadRequestException('Update failed'))
        .mockRejectedValueOnce(new BadRequestException('Update failed'));

      const failedWebhookNames = webhooksStubData
        .map((webhook) => webhook.boardName)
        .join(', ');

      const result =
        await trelloWebhooksLogicService.updateManyTrelloWebhookNotifications(
          userStubData,
          updateManyWebhooksDto,
        );

      expect(result).toEqual({
        message: expect.stringContaining(failedWebhookNames),
        statusCode: HttpStatus.OK,
      });
    });

    it('should throw ForbiddenException if the user is not a subscriber', async () => {
      jest.spyOn(trelloWebhookRepository, 'findManyByIds').mockResolvedValue(
        webhooksStubData.map((webhook) => ({
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
        ...webhooksStubData[0],
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

  describe('handleTrelloWebhook', () => {
    let webhookStubData: Webhook;
    let webhookActionMock: any;
    let boardMemberships: BoardMember[];

    beforeEach(() => {
      webhookStubData = { ...webhookStub };
      webhookActionMock = { ...webhookActionStub };
      boardMemberships = [
        {
          id: 'id1',
          idMember: webhookStubData.subscribers[0].trelloUserId,
          memberType: 'normal',
          unconfirmed: false,
          deactivated: false,
        },
        {
          id: 'id2',
          idMember: webhookStubData.subscribers[1].trelloUserId,
          memberType: 'admin',
          unconfirmed: false,
          deactivated: false,
        },
      ];

      jest
        .spyOn(trelloWebhookRepository, 'findOneById')
        .mockResolvedValue(webhookStubData);

      jest.spyOn(trelloBatchApiService, 'fetchManyUrls').mockResolvedValue({
        card: trelloCardMock,
        board: trelloBoardMock,
      });

      jest
        .spyOn(trelloCardsApiService, 'fetchCardById')
        .mockResolvedValue(trelloCardMock);

      jest
        .spyOn(trelloBoardsApiService, 'fetchBoardById')
        .mockResolvedValue(trelloBoardMock);

      jest
        .spyOn(trelloBoardsApiService, 'fetchBoardMemberships')
        .mockResolvedValue(boardMemberships);
    });

    it('should return undefined if webhook was not found in database', async () => {
      jest
        .spyOn(trelloWebhookRepository, 'findOneById')
        .mockResolvedValue(null);

      const result =
        await trelloWebhooksLogicService.handleTrelloWebhook(webhookActionMock);

      expect(result).toEqual(undefined);
    });

    it('should return undefined if webhook action does not relate to any category', async () => {
      webhookActionMock.action.type = 'not matching type';
      webhookActionMock.action.display.translationKey =
        'not matching detailed action';

      const result =
        await trelloWebhooksLogicService.handleTrelloWebhook(webhookActionMock);

      expect(result).toBeUndefined();
    });

    it('should return undefined if no subscribers exist for the action', async () => {
      jest
        .spyOn(trelloWebhooksLogicService, 'getWebhook')
        .mockResolvedValue(webhookStubData);

      const result =
        await trelloWebhooksLogicService.handleTrelloWebhook(webhookActionMock);

      expect(result).toBeUndefined();
    });

    it('should correctly handle a card action with subscribers', async () => {
      const webhookStubCardNotifications = {
        ...webhookStubData,
        notifications: {
          ...webhookStubData.notifications,
          card: { cardCommentAdded: [userStubData.trello.userId] },
        },
      };

      const webhookCardAction = {
        ...webhookActionMock,
      };

      webhookCardAction.action.type = TrelloWebhookActions.CARD_COMMENT_ADDED;
      webhookCardAction.action.display.translationKey =
        TrelloWebhookDetailedActions.CARD_COMMENT_ADDED;

      jest
        .spyOn(trelloWebhookRepository, 'findOneById')
        .mockResolvedValue(webhookStubCardNotifications);

      // jest
      //   .spyOn(trelloCardsApiService, 'fetchCardById')
      //   .mockResolvedValue(trelloCardMock);

      jest
        .spyOn(trelloActionsService, 'handleCardActions')
        .mockResolvedValue(undefined);

      await trelloWebhooksLogicService.handleTrelloWebhook(webhookCardAction);

      expect(trelloActionsService.handleCardActions).toHaveBeenCalledWith(
        [userStubData.trello.userId],
        trelloBoardMock,
        trelloCardMock,
        TrelloWebhookDetailedActions.CARD_COMMENT_ADDED,
        webhookCardAction,
      );
    });

    it('should correctly handle a board action with subscribers', async () => {
      const webhookStubBoardNotifications = {
        ...webhookStubData,
        notifications: {
          ...webhookStubData.notifications,
          board: { boardRenamed: [userStubData.trello.userId] },
        },
      };

      const webhookBoardAction = {
        ...webhookActionMock,
      };

      webhookBoardAction.action.type = TrelloWebhookActions.BOARD_UPDATED;
      webhookBoardAction.action.display.translationKey =
        TrelloWebhookBoardActions.BOARD_RENAMED;

      jest
        .spyOn(trelloWebhookRepository, 'findOneById')
        .mockResolvedValue(webhookStubBoardNotifications);

      jest
        .spyOn(trelloActionsService, 'handleBoardActions')
        .mockResolvedValue(undefined);

      await trelloWebhooksLogicService.handleTrelloWebhook(webhookBoardAction);

      expect(trelloActionsService.handleBoardActions).toHaveBeenCalledWith(
        [userStubData.trello.userId],
        trelloBoardMock,
        TrelloWebhookDetailedActions.BOARD_RENAMED,
        webhookBoardAction,
      );
    });

    it('should correctly handle an admin action with subscribers', async () => {
      const webhookStubAdminNotifications = {
        ...webhookStubData,
        notifications: {
          ...webhookStubData.notifications,
          admin: { boardMemberInvitationJoined: [userStubData.trello.userId] },
        },
      };

      jest
        .spyOn(trelloWebhookRepository, 'findOneById')
        .mockResolvedValue(webhookStubAdminNotifications);

      jest
        .spyOn(trelloActionsService, 'handleAdminActions')
        .mockResolvedValue(undefined);

      const webhookAdminAction = {
        ...webhookActionMock,
      };

      webhookAdminAction.action.type = TrelloWebhookActions.BOARD_MEMBER_ADDED;
      webhookAdminAction.action.display.translationKey =
        TrelloWebhookAdminActions.BOARD_MEMBER_INVITATION_JOINED;

      await trelloWebhooksLogicService.handleTrelloWebhook(webhookAdminAction);

      expect(trelloActionsService.handleAdminActions).toHaveBeenCalledWith(
        [userStubData.trello.userId],
        trelloBoardMock,
        TrelloWebhookDetailedActions.BOARD_MEMBER_INVITATION_JOINED,
        webhookAdminAction,
      );
    });

    it('should correctly handle a personal action with subscribers', async () => {
      const webhookStubPersonalNotifications = {
        ...webhookStubData,
        notifications: {
          ...webhookStubData.notifications,
          personal: { cardMemberAdded: [userStubData.trello.userId] },
        },
      };

      const webhookPersonalAction = {
        ...webhookActionMock,
      };

      webhookPersonalAction.action.type =
        TrelloWebhookActions.CARD_MEMBER_ADDED;
      webhookPersonalAction.action.display.translationKey =
        TrelloWebhookPersonalActions.CARD_MEMBER_ADDED;

      jest
        .spyOn(trelloWebhookRepository, 'findOneById')
        .mockResolvedValue(webhookStubPersonalNotifications);

      jest
        .spyOn(trelloActionsService, 'handlePersonalAction')
        .mockResolvedValue(undefined);

      await trelloWebhooksLogicService.handleTrelloWebhook(
        webhookPersonalAction,
      );

      expect(trelloActionsService.handlePersonalAction).toHaveBeenCalledWith(
        userStubData.trello.userId,
        trelloBoardMock,
        TrelloWebhookPersonalActions.CARD_MEMBER_ADDED,
        webhookPersonalAction,
        webhookStubPersonalNotifications,
        trelloCardMock,
      );
    });

    it('should not notify target member twice', async () => {
      const webhookStubCardNotifications = {
        ...webhookStubData,
        notifications: {
          ...webhookStubData.notifications,
          card: {
            cardMemberAdded: [
              userStubData.trello.userId,
              '674ec752cba1224342f87c20',
            ],
          },
          personal: {
            cardMemberAdded: [userStubData.trello.userId],
          },
        },
      };

      const webhookCardAction = {
        ...webhookActionMock,
      };

      webhookCardAction.action.type = TrelloWebhookActions.CARD_MEMBER_ADDED;
      webhookCardAction.action.display.translationKey =
        TrelloWebhookDetailedActions.CARD_MEMBER_ADDED;

      jest
        .spyOn(trelloWebhookRepository, 'findOneById')
        .mockResolvedValue(webhookStubCardNotifications);

      jest
        .spyOn(trelloActionsService, 'handleCardActions')
        .mockResolvedValue(undefined);

      await trelloWebhooksLogicService.handleTrelloWebhook(webhookCardAction);

      expect(trelloActionsService.handlePersonalAction).toHaveBeenCalledWith(
        userStubData.trello.userId,
        trelloBoardMock,
        TrelloWebhookPersonalActions.CARD_MEMBER_ADDED,
        webhookCardAction,
        webhookStubCardNotifications,
        trelloCardMock,
      );

      expect(trelloActionsService.handleCardActions).toHaveBeenCalledWith(
        ['674ec752cba1224342f87c20'],
        trelloBoardMock,
        trelloCardMock,
        TrelloWebhookDetailedActions.CARD_MEMBER_ADDED,
        webhookCardAction,
      );
    });

    it('should notify about admin actions only board admin role members', async () => {
      const webhookStubMultipleNotifications = {
        ...webhookStubData,
        notifications: {
          ...webhookStubData.notifications,
          admin: { boardAdminAdded: [userStubData.trello.userId] },
        },
      };

      const adminMemberIds = boardMemberships
        .filter((member) => member.memberType === 'admin')
        .map((admin) => admin.idMember);

      jest
        .spyOn(trelloWebhookRepository, 'findOneById')
        .mockResolvedValue(webhookStubMultipleNotifications);

      jest
        .spyOn(trelloActionsService, 'handleAdminActions')
        .mockResolvedValue(undefined);

      jest
        .spyOn(trelloBoardsApiService, 'fetchBoardMemberships')
        .mockResolvedValue(boardMemberships);

      const webhookAdminAction = {
        ...webhookActionMock,
      };

      webhookAdminAction.action.type = TrelloWebhookActions.BOARD_ADMIN_ADDED;
      webhookAdminAction.action.display.translationKey =
        TrelloWebhookAdminActions.BOARD_ADMIN_ADDED;

      await trelloWebhooksLogicService.handleTrelloWebhook(webhookActionMock);

      expect(trelloActionsService.handleAdminActions).toHaveBeenCalledWith(
        adminMemberIds,
        trelloBoardMock,
        TrelloWebhookAdminActions.BOARD_ADMIN_ADDED,
        webhookAdminAction,
      );
    });
  });

  describe('disconnectFromTrelloWebhook', () => {
    let webhookStubData: Webhook;
    let updatedUserProps: Partial<User>;

    beforeEach(() => {
      webhookStubData = {
        ...webhookStub,
        subscribers: [
          {
            userId: userStubData.trello.userId,
            email: userStubData.email,
            trelloUserId: userStubData.trello.userId,
            trelloToken: userStubData.trello.token,
            notificationProfile: TrelloWebhookNotificationProfiles.BASIC,
          },
        ],
      };

      updatedUserProps = {
        trello: {
          webhooks: userStubData.trello.webhooks.filter(
            (webhook) => webhook.webhookId !== webhookStubData.id,
          ),
        },
        lastActivityDate: fixedDate,
      };

      jest.spyOn(usersService, 'getUser').mockResolvedValue(userStubData);

      jest
        .spyOn(trelloWebhooksLogicService, 'getWebhook')
        .mockResolvedValue(webhookStubData);
    });

    it('should disconnect from a webhook successfully', async () => {
      jest.spyOn(usersService, 'updateUser').mockResolvedValue(null);

      jest
        .spyOn(trelloWebhookRepository, 'updateById')
        .mockResolvedValue(webhookStubData);

      jest
        .spyOn(notificationBotService, 'sendMessageToUser')
        .mockResolvedValue(null);

      jest.spyOn(configService, 'get').mockReturnValue('frontendlink');

      const result =
        await trelloWebhooksLogicService.disconnectFromTrelloWebhook(
          userStubData,
          webhookStubData,
        );

      expect(usersService.getUser).toHaveBeenCalledWith(
        userStubData,
        undefined,
      );
      expect(trelloWebhooksLogicService.getWebhook).toHaveBeenCalledWith(
        webhookStubData,
        undefined,
      );

      expect(usersService.updateUser).toHaveBeenCalledWith(
        userStubData,
        updatedUserProps,
        undefined,
      );

      expect(trelloWebhookRepository.updateById).toHaveBeenCalledWith(
        webhookStubData.id,
        expect.objectContaining({
          subscribers: [],
          notifications: expect.any(Object),
        }),
      );

      expect(notificationBotService.sendMessageToUser).toHaveBeenCalledWith(
        userStubData.telegram,
        expect.stringContaining(webhookStubData.boardName),
        expect.any(Boolean),
        expect.any(Array),
      );

      expect(result).toEqual({
        message: expect.stringContaining(webhookStubData.id),
        statusCode: HttpStatus.OK,
        data: webhookStubData,
      });
    });

    it('should throw a BadRequestException if the user is not connected to the webhook', async () => {
      jest.spyOn(usersService, 'getUser').mockResolvedValue({
        ...userStubData,
        trello: {
          ...userStubData.trello,
          webhooks: [],
        },
      });

      await expect(
        trelloWebhooksLogicService.disconnectFromTrelloWebhook(
          userStubData,
          webhookStubData,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw a BadRequestException if the webhook update fails', async () => {
      jest
        .spyOn(trelloWebhookRepository, 'updateById')
        .mockRejectedValue(new BadRequestException('Update failed'));

      await expect(
        trelloWebhooksLogicService.disconnectFromTrelloWebhook(
          userStubData,
          webhookStubData,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should correctly remove the user from subscribers and notifications', async () => {
      jest
        .spyOn(trelloWebhookRepository, 'updateById')
        .mockResolvedValue(webhookStubData);

      jest.spyOn(usersService, 'updateUser').mockResolvedValue(null);

      jest
        .spyOn(notificationBotService, 'sendMessageToUser')
        .mockResolvedValue(null);

      jest.spyOn(configService, 'get').mockReturnValue('frontendlink');

      await trelloWebhooksLogicService.disconnectFromTrelloWebhook(
        userStubData,
        webhookStubData,
      );

      expect(trelloWebhookRepository.updateById).toHaveBeenCalledWith(
        webhookStubData.id,
        expect.objectContaining({
          subscribers: [],
          notifications: expect.any(Object),
        }),
      );
    });

    it('should send a Telegram message when the user is disconnected', async () => {
      jest.spyOn(usersService, 'updateUser').mockResolvedValue(null);

      jest
        .spyOn(trelloWebhookRepository, 'updateById')
        .mockResolvedValue(webhookStubData);

      jest
        .spyOn(notificationBotService, 'sendMessageToUser')
        .mockResolvedValue(undefined);

      jest.spyOn(configService, 'get').mockReturnValue('frontendlink');

      await trelloWebhooksLogicService.disconnectFromTrelloWebhook(
        userStubData,
        webhookStubData,
      );

      expect(notificationBotService.sendMessageToUser).toHaveBeenCalledWith(
        userStubData.telegram,
        expect.stringContaining(webhookStubData.boardName),
        expect.any(Boolean),
        expect.any(Array),
      );
    });
  });

  describe('disconnectFromAllTrelloWebhooks', () => {
    let updatedUserProps: Partial<User>;

    beforeEach(() => {
      updatedUserProps = {
        trello: { webhooks: [] },
      };
    });

    it('should disconnect from all webhooks successfully', async () => {
      jest
        .spyOn(trelloWebhookRepository, 'findManyByIds')
        .mockResolvedValue(webhooksStubData);

      jest
        .spyOn(trelloWebhookRepository, 'bulkUpdateWebhooks')
        .mockResolvedValue(null);

      jest.spyOn(usersService, 'updateUser').mockResolvedValue(null);

      const result =
        await trelloWebhooksLogicService.disconnectFromAllTrelloWebhooks(
          userStubData,
        );

      expect(usersService.getUser).toHaveBeenCalledWith(
        userStubData,
        undefined,
      );

      expect(trelloWebhookRepository.findManyByIds).toHaveBeenCalledWith([
        webhooksStubData[0].id,
        webhooksStubData[1].id,
      ]);

      expect(trelloWebhookRepository.bulkUpdateWebhooks).toHaveBeenCalled();
      expect(usersService.updateUser).toHaveBeenCalledWith(
        userStubData,
        updatedUserProps,
        undefined,
      );

      expect(result).toEqual({
        message: expect.stringContaining(userStubData.id),
        statusCode: HttpStatus.OK,
      });
    });

    it('should return success message if user has no webhooks', async () => {
      jest.spyOn(usersService, 'getUser').mockResolvedValue({
        ...userStubData,
        trello: { ...userStubData.trello, webhooks: [] },
      });

      const result =
        await trelloWebhooksLogicService.disconnectFromAllTrelloWebhooks(
          userStubData,
        );

      expect(usersService.getUser).toHaveBeenCalledWith(
        userStubData,
        undefined,
      );
      expect(trelloWebhookRepository.findManyByIds).not.toHaveBeenCalled();
      expect(usersService.updateUser).not.toHaveBeenCalled();

      expect(result).toEqual({
        message: expect.stringContaining(userStubData.email),
        statusCode: HttpStatus.OK,
      });
    });

    it('should throw a BadRequestException if the update fails', async () => {
      jest
        .spyOn(trelloWebhookRepository, 'findManyByIds')
        .mockResolvedValue(webhooksStubData);

      jest
        .spyOn(trelloWebhookRepository, 'bulkUpdateWebhooks')
        .mockRejectedValue(new BadRequestException());

      await expect(
        trelloWebhooksLogicService.disconnectFromAllTrelloWebhooks(
          userStubData,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should correctly call bulk update for removing user from webhooks', async () => {
      jest
        .spyOn(trelloWebhookRepository, 'findManyByIds')
        .mockResolvedValue(webhooksStubData);

      jest
        .spyOn(trelloWebhookRepository, 'bulkUpdateWebhooks')
        .mockResolvedValue(null);

      jest.spyOn(usersService, 'updateUser').mockResolvedValue(null);

      await trelloWebhooksLogicService.disconnectFromAllTrelloWebhooks(
        userStubData,
      );

      expect(trelloWebhookRepository.bulkUpdateWebhooks).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            updateOne: {
              filter: { id: webhooksStubData[0].id },
              update: expect.any(Object),
            },
          }),
          expect.objectContaining({
            updateOne: {
              filter: { id: webhooksStubData[1].id },
              update: expect.any(Object),
            },
          }),
        ]),
      );
    });
  });

  describe('removeTrelloWebhook', () => {
    let decryptedToken: string;

    beforeEach(() => {
      decryptedToken = webhookStub.author.trelloToken.replace('encrypted', '');
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
        message: expect.stringContaining(webhookStubData.id),
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
        message: expect.stringContaining(webhookStubData.id),
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
    let webhooksStubData: Webhook[];

    beforeEach(() => {
      webhooksStubData = [
        {
          ...webhookStub,
          author: {
            userId: userStubData.trello.userId,
            email: userStubData.email,
            trelloUserId: userStubData.trello.userId,
            trelloToken: userStubData.trello.token,
          },
        },
        {
          ...newWebhookStub,
          author: {
            userId: userStubData.trello.userId,
            email: userStubData.email,
            trelloUserId: userStubData.trello.userId,
            trelloToken: userStubData.trello.token,
          },
        },
      ];
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
        message: expect.stringContaining(userStubData.trello.userId),
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
    beforeEach(() => {
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
        message: expect.any(String),
        statusCode: HttpStatus.OK,
      });
    });

    it('should delete all webhooks successfully', async () => {
      jest
        .spyOn(trelloWebhooksLogicService, 'findAllWebhooks')
        .mockResolvedValue(webhooksStubData);

      jest
        .spyOn(trelloWebhooksLogicService, 'removeTrelloWebhook')
        .mockResolvedValue(null);

      const result =
        await trelloWebhooksLogicService.removeAllWebhooks(superAdminStubData);

      expect(trelloWebhooksLogicService.findAllWebhooks).toHaveBeenCalled();
      expect(
        trelloWebhooksLogicService.removeTrelloWebhook,
      ).toHaveBeenCalledTimes(webhooksStubData.length);

      expect(result).toEqual({
        message: expect.any(String),
        statusCode: HttpStatus.OK,
      });
    });

    it('should throw BadRequestException if webhook deletion fails', async () => {
      jest
        .spyOn(trelloWebhooksLogicService, 'findAllWebhooks')
        .mockResolvedValue(webhooksStubData);

      jest
        .spyOn(trelloWebhooksLogicService, 'removeTrelloWebhook')
        .mockRejectedValue(new BadRequestException());

      await expect(
        trelloWebhooksLogicService.removeAllWebhooks(superAdminStubData),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
