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

import { webhookStub } from 'src/trello/__mocks__/webhook.stub';
import { superAdminStub, userStub } from 'src/user/__mocks__/user.stub';
import { UsersRepository } from 'src/user/repositories/users.repository';
import { UsersService } from 'src/user/services/users.service';
import { TrelloWebhookRepository } from 'src/trello/repositories/webhook.repository';
import {
  TrelloBoardsApiService,
  TrelloCardsApiService,
  TrelloWebhooksApiService,
} from '@trello/api';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { trelloBoardMock } from 'src/trello/__mocks__/trello.stub';
import { UserSearchPathEnum } from 'src/user/enums/query.enum';
import { validateTrelloToken } from 'src/common/helpers/trello-tokens';
import { I18nKeys } from 'src/common/enums/i18n-keys.enum';
import { TrelloBoard } from 'src/trello/dto/board.dto';
import { Webhook } from 'src/trello/entities/webhook.entity';
import { User } from 'src/user/entities/user.entity';
import { createFilteredWebhookCopy } from 'src/common/helpers/trello-notifications';

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

    (encryptText as jest.Mock).mockImplementation(
      (text: string) => `encrypted${text}`,
    );
    (decryptText as jest.Mock).mockImplementation(
      (text: string) => `decrypted${text}`,
    );

    (validateTrelloToken as jest.Mock).mockImplementation(() => {});

    jest.spyOn(usersService, 'getUser').mockResolvedValue(userStub());

    jest
      .spyOn(trelloWebhooksLogicService, 'getWebhook')
      .mockResolvedValue(webhookStub);
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
        `decrypted${webhook.author.trelloToken}`,
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
        `decrypted${webhook.author.trelloToken}`,
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

      Object.defineProperty(trelloWebhooksLogicService, 'webhookCallbackURL', {
        value: 'https://mycallback.url',
        writable: true,
      });
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

      // No deletion or creation should occur
      expect(trelloWebhookRepository.deleteById).not.toHaveBeenCalled();
      expect(trelloWebhookApiService.createWebhook).not.toHaveBeenCalled();

      expect(result).toEqual(existingWebhook);
    });

    it('should recreate the webhook if Trello API returns an invalid token error', async () => {
      const decryptedAuthorToken = `decrypted${webhookStub.author.trelloToken}`;

      const decryptedUserToken = `decrypted${requestedUser.trello.token}`;

      jest
        .spyOn(trelloTokensLogicService, 'isTokenInfinite')
        .mockRejectedValue(new Error(I18nKeys.ERRORS_TRELLO_INVALID_APP_KEY));

      jest
        .spyOn(trelloWebhookApiService, 'getWebhooksByToken')
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
      const decryptedAuthorToken = `decrypted${webhookStub.author.trelloToken}`;

      const decryptedUserToken = `decrypted${requestedUser.trello.token}`;

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
                    webhookId: newWebhook.id, // ✅ Replace with new webhook ID
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
});
