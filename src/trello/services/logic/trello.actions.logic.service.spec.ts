import { Test } from '@nestjs/testing';
import { SharedConfigService } from 'src/config/shared.config.service';
import {
  TrelloActionsLogicService,
  TrelloWebhooksLogicService,
} from '@trello/logic';
import { NotificationBotService } from 'src/telegram/notification-bot/notification-bot.service';
import { createMock } from '@golevelup/ts-jest';

import {
  webhookActionStub,
  webhookStub,
} from 'src/trello/__mocks__/webhook.stub';
import { superAdminStub, userStub } from 'src/user/__mocks__/user.stub';
import { UsersService } from 'src/user/services/users.service';
import {
  trelloBoardMock,
  trelloCardMock,
} from 'src/trello/__mocks__/trello.stub';
import { User } from 'src/user/entities/user.entity';
import {
  TrelloWebhookAdminActions,
  TrelloWebhookBoardActions,
  TrelloWebhookPersonalActions,
} from 'src/trello/enums/trello.actions.enum';
import { I18nService } from 'nestjs-i18n';
import { ConfigService } from '@nestjs/config';
import { HttpStatus } from '@nestjs/common';
import { DiscordService } from 'src/discord/discord.service';

jest.mock('src/common/helpers/trello-notifications', () => ({
  notificationMessageGenerator: jest.fn().mockImplementation(() => 'message'),
  initializeNotificationArrays: jest.fn().mockReturnValue({
    personal: {},
    board: {},
    card: {},
    admin: {},
  }),
  getUpdatedWebhookNotifications: jest.fn().mockReturnValue({}),
  mapNotificationsToBoolean: jest.fn().mockReturnValue({
    personal: {},
    board: {},
    card: {},
    admin: {},
  }),
}));

describe('TrelloActionsLogicService', () => {
  let originalDate = Date;

  let trelloActionsLogicService: TrelloActionsLogicService;
  let trelloWebhooksLogicService: TrelloWebhooksLogicService;
  let usersService: UsersService;
  let notificationBotService: NotificationBotService;

  let userStubData: User;
  let usersToNotify: User[];
  let usersToNotifyIds: string[];
  let webhookActionMock: any;
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
        TrelloActionsLogicService,
        {
          provide: TrelloWebhooksLogicService,
          useValue: createMock<TrelloWebhooksLogicService>(),
        },
        { provide: UsersService, useValue: createMock<UsersService>() },
        {
          provide: SharedConfigService,
          useValue: createMock<SharedConfigService>(),
        },
        {
          provide: NotificationBotService,
          useValue: createMock<NotificationBotService>(),
        },
        {
          provide: DiscordService,
          useValue: createMock<DiscordService>(),
        },
        { provide: I18nService, useValue: createMock<I18nService>() },
        { provide: ConfigService, useValue: createMock<ConfigService>() },
      ],
    }).compile();

    trelloWebhooksLogicService = moduleRef.get<TrelloWebhooksLogicService>(
      TrelloWebhooksLogicService,
    );

    trelloActionsLogicService = moduleRef.get<TrelloActionsLogicService>(
      TrelloActionsLogicService,
    );

    notificationBotService = moduleRef.get<NotificationBotService>(
      NotificationBotService,
    );
    usersService = moduleRef.get<UsersService>(UsersService);

    userStubData = { ...userStub() };
    webhookActionMock = { ...webhookActionStub };
    usersToNotify = [userStubData, superAdminStub()];

    usersToNotifyIds = [
      userStubData.trello.userId,
      superAdminStub().trello.userId,
    ];

    jest
      .spyOn(usersService, 'findUserByTrelloId')
      .mockResolvedValue(userStubData);

    jest
      .spyOn(usersService, 'findUsersByTrelloIds')
      .mockResolvedValue(usersToNotify);

    jest
      .spyOn(trelloWebhooksLogicService, 'getWebhook')
      .mockResolvedValue(webhookStub);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.resetAllMocks();
    global.Date = originalDate;
  });

  describe('handlePersonalAction', () => {
    it('should send a message to user', async () => {
      const userToNotify = userStubData;

      const webhookAction = {
        ...webhookActionMock,
        action: {
          ...webhookActionMock.action,
          display: {
            translationKey: TrelloWebhookPersonalActions.CARD_MEMBER_ADDED,
          },
        },
      };

      jest
        .spyOn(notificationBotService, 'sendMessageToUser')
        .mockResolvedValue(undefined);

      await trelloActionsLogicService.handlePersonalAction(
        userToNotify.trello.userId,
        trelloBoardMock,
        webhookAction.action.display.translationKey,
        webhookAction,
        webhookStub,
        trelloCardMock,
      );

      expect(usersService.findUserByTrelloId).toHaveBeenCalledWith(
        userToNotify.trello.userId,
      );

      expect(
        trelloWebhooksLogicService.disconnectFromTrelloWebhook,
      ).not.toHaveBeenCalled();

      expect(notificationBotService.sendMessageToUser).toHaveBeenCalledWith(
        userToNotify.telegram,
        'message',
      );
    });

    it('should disconnect target user from webhook if he was deleted from board', async () => {
      const userToNotify = userStubData;

      const webhookAction = {
        ...webhookActionMock,
        action: {
          ...webhookActionMock.action,
          display: {
            translationKey: TrelloWebhookPersonalActions.BOARD_MEMBER_REMOVED,
          },
        },
      };

      const webhookStubCopy = {
        ...webhookStub,
      };

      jest
        .spyOn(trelloWebhooksLogicService, 'disconnectFromTrelloWebhook')
        .mockResolvedValue({
          message: '',
          statusCode: HttpStatus.OK,
          data: webhookStub,
        });

      jest
        .spyOn(notificationBotService, 'sendMessageToUser')
        .mockResolvedValue(undefined);

      await trelloActionsLogicService.handlePersonalAction(
        userToNotify.trello.userId,
        trelloBoardMock,
        webhookAction.action.display.translationKey,
        webhookAction,
        webhookStubCopy,
      );

      expect(usersService.findUserByTrelloId).toHaveBeenCalledWith(
        userToNotify.trello.userId,
      );

      expect(notificationBotService.sendMessageToUser).toHaveBeenCalled();

      expect(
        trelloWebhooksLogicService.disconnectFromTrelloWebhook,
      ).toHaveBeenCalledWith(userToNotify, webhookStub);

      expect(notificationBotService.sendMessageToUser).toHaveBeenCalledWith(
        userToNotify.telegram,
        undefined,
      );
    });
  });

  describe('handleCardAction', () => {
    it('should send messages to all subscribed users', async () => {
      const webhookAction = {
        ...webhookActionMock,
      };

      jest
        .spyOn(notificationBotService, 'sendMessageToUser')
        .mockResolvedValue(undefined);

      await trelloActionsLogicService.handleCardActions(
        [usersToNotify[0].trello.userId, usersToNotify[1].trello.userId],
        trelloBoardMock,
        trelloCardMock,
        webhookAction.action?.display?.translationKey,
        webhookAction,
      );

      expect(usersService.findUsersByTrelloIds).toHaveBeenCalledWith(
        usersToNotifyIds,
      );

      expect(notificationBotService.sendMessageToUser).toHaveBeenCalledTimes(
        usersToNotifyIds.length,
      );
    });
  });

  describe('handleBoardAction', () => {
    it('should send messages to all subscribed users', async () => {
      const webhookAction = {
        ...webhookActionMock,
        action: {
          ...webhookActionMock.action,
          display: {
            translationKey: TrelloWebhookBoardActions.BOARD_RENAMED,
          },
        },
      };

      jest
        .spyOn(notificationBotService, 'sendMessageToUser')
        .mockResolvedValue(undefined);

      await trelloActionsLogicService.handleBoardActions(
        usersToNotifyIds,
        trelloBoardMock,
        webhookAction.action?.display?.translationKey,
        webhookAction,
      );

      expect(usersService.findUsersByTrelloIds).toHaveBeenCalledWith(
        usersToNotifyIds,
      );

      expect(notificationBotService.sendMessageToUser).toHaveBeenCalledTimes(
        usersToNotifyIds.length,
      );
    });
  });

  describe('handleAdminAction', () => {
    it('should send messages to all subscribed board admins', async () => {
      const adminsToNotifyIds = [superAdminStub().trello.userId];

      const webhookAction = {
        ...webhookActionMock,
        action: {
          ...webhookActionMock.action,
          display: {
            translationKey:
              TrelloWebhookAdminActions.BOARD_MEMBER_INVITATION_JOINED,
          },
        },
      };

      jest
        .spyOn(usersService, 'findUsersByTrelloIds')
        .mockResolvedValue([superAdminStub()]);

      jest
        .spyOn(notificationBotService, 'sendMessageToUser')
        .mockResolvedValue(undefined);

      await trelloActionsLogicService.handleAdminActions(
        adminsToNotifyIds,
        trelloBoardMock,
        webhookAction.action?.display?.translationKey,
        webhookAction,
      );

      expect(usersService.findUsersByTrelloIds).toHaveBeenCalledWith(
        adminsToNotifyIds,
      );

      expect(notificationBotService.sendMessageToUser).toHaveBeenCalledTimes(
        adminsToNotifyIds.length,
      );
    });
  });
});
