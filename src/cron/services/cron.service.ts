import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { TrelloBoardsApiService } from '@trello/api';
import { TrelloWebhooksLogicService } from '@trello/logic';
import {
  addDays,
  differenceInDays,
  format,
  isBefore,
  parseISO,
} from 'date-fns';
import { I18nService } from 'nestjs-i18n';
import { I18nKeys } from 'src/common/enums/i18n-keys.enum';
import { Languages } from 'src/common/enums/languages.enum';
import { decryptText } from 'src/common/helpers/hashing';
import { SharedConfigService } from 'src/config/shared.config.service';
import { DiscordService } from 'src/discord/discord.service';
import { redisKeys } from 'src/redis/enums/redis-keys.enum';
import { RedisService } from 'src/redis/services/redis.service';
import { AdminBotService } from 'src/telegram/admin-bot/admin-bot.service';
import { NotificationBotService } from 'src/telegram/notification-bot/notification-bot.service';
import { TrelloBoardField } from 'src/trello/enums/trello.model.fields.enum';
import { UserSearchPath } from 'src/user/enums/query.enum';
import { UsersService } from 'src/user/services/users.service';

@Injectable()
export class CronService {
  private readonly encryptionKey: string;
  private readonly logger = new Logger(CronService.name);
  constructor(
    private readonly trelloBoardsApiService: TrelloBoardsApiService,
    private readonly trelloWebhooksLogicService: TrelloWebhooksLogicService,
    private readonly usersService: UsersService,
    private readonly redisService: RedisService,
    private readonly adminBotService: AdminBotService,
    private readonly notificationBotService: NotificationBotService,
    private readonly discordService: DiscordService,
    private readonly i18nService: I18nService,
    private readonly sharedConfigService: SharedConfigService,
  ) {
    this.encryptionKey = this.sharedConfigService.getEncryptionKey();
  }

  async onModuleInit() {
    await this.checkAndRecoverMissedStats();
  }

  @Cron(CronExpression.EVERY_WEEK)
  async clearUnactiveWebhooks() {
    try {
      this.logger.log(`Unactive webhooks clear cron started`);
      const webhooks = await this.trelloWebhooksLogicService.findAllWebhooks();

      const currentDate = new Date();

      const unactiveWebhooks = [];

      for (const webhook of webhooks) {
        const decryptedAuthorToken = decryptText(
          webhook.author.trelloToken,
          this.encryptionKey,
        );

        const dateLastActivity =
          await this.trelloBoardsApiService.fetchBoardField(
            decryptedAuthorToken,
            webhook.idModel,
            TrelloBoardField.DATE_LAST_ACTIVITY,
          );

        if (!dateLastActivity) {
          console.log(
            `No ${TrelloBoardField.DATE_LAST_ACTIVITY} for board ${webhook.boardName}`,
          );
          continue;
        }

        const dateLastActivityParsed = new Date(dateLastActivity.value);

        //last action on board
        const daysSinceLastActivity = differenceInDays(
          currentDate,
          dateLastActivityParsed,
        );

        //last webhook update in DB
        const daysSinceLastWebhookUpdate = differenceInDays(
          currentDate,
          webhook.updatedAt,
        );

        // unactive for more than 30 days
        if (daysSinceLastActivity >= 30) {
          unactiveWebhooks.push(webhook);
          continue;
        }

        //if webhook has 1 subscriber and disconnected telegram
        if (webhook.subscribers.length === 1) {
          const connectedUser = await this.usersService.findUserByTrelloId(
            webhook.subscribers[0].trelloUserId,
          );

          const daysSinceTelegramConnected = differenceInDays(
            currentDate,
            connectedUser.telegram.updatedAt,
          );

          if (
            daysSinceTelegramConnected >= 30 &&
            !connectedUser.telegram.chatId
          ) {
            unactiveWebhooks.push(webhook);
            continue;
          }
        }

        //if webhook has no subscriber and updates
        if (
          webhook.subscribers.length === 0 &&
          daysSinceLastWebhookUpdate >= 30
        ) {
          unactiveWebhooks.push(webhook);
          continue;
        }
      }

      const removePromises = unactiveWebhooks.map(async (webhook) => {
        try {
          console.log(
            `Removing inactive webhook for board: ${webhook.boardName}`,
          );
          await this.trelloWebhooksLogicService.removeTrelloWebhook(webhook.id);
          return webhook.boardName;
        } catch (error) {
          console.error(
            `Error removing webhook for board ${webhook.boardName}:`,
            error.message,
          );
          this.logger.error(`Error clearing webhook ${webhook}`);
        }
      });

      const removedWebhooks = await Promise.all(removePromises);
      console.log('Successfully removed inactive webhooks:', removedWebhooks);
      this.logger.log(`Unactive webhooks clear cron finished`);
    } catch (error) {
      console.error('Error in clearUnactiveBoards:', error.message);
    }
  }

  //if server is down at this moment, it will send daily stats when the server will up
  //but if server was down more then one day, we do not guarantee
  //data accuracy, because loginnedUsers based on lastLoginDate of user object,
  @Cron('55 23 * * *')
  async dailyStatsClosing(formattedYesterday?: string) {
    let statsDate: Date;

    if (formattedYesterday) {
      // If a specific date is provided (for recovery), parse it correctly
      statsDate = parseISO(formattedYesterday);
    } else {
      // Use today's date
      statsDate = new Date();
      statsDate.setUTCDate(statsDate.getUTCDate());
      statsDate.setUTCHours(0, 0, 0, 0); // Midnight UTC
    }

    console.log('Processing daily stats for:', statsDate.toISOString());

    // Set start and end of the day
    const startOfDay = new Date(statsDate);
    startOfDay.setUTCHours(0, 0, 0, 0);

    const endOfDay = new Date(statsDate);
    endOfDay.setUTCHours(23, 59, 59, 999);

    console.log('Start of day:', startOfDay.toISOString());
    console.log('End of day:', endOfDay.toISOString());

    // Format date for messages (but not for storage!)
    const formattedDateForMessage = format(startOfDay, 'dd-MM-yyyy');

    // Fetch users and stats
    const usersLoggedIn = await this.usersService.findAll({
      date: 'lastLoginDate',
      fromDate: startOfDay.toISOString(),
      toDate: endOfDay.toISOString(),
    });

    const newUsers = await this.usersService.findAll({
      date: 'createdAt',
      fromDate: startOfDay.toISOString(),
      toDate: endOfDay.toISOString(),
    });

    // Get stored daily stats
    const dailyStats = JSON.parse(
      await this.redisService.getValue(redisKeys.DAILY_STATS),
    );

    // Generate notification message
    const message = await this.adminBotService.dailyStatsNotification(
      formattedDateForMessage,
      {
        ...dailyStats,
        newUsers: newUsers.total,
        loginnedUsers: usersLoggedIn.total,
      },
    );

    // Notify admins
    await this.adminBotService.notifyAdmins(message);

    // Store last execution date in ISO format (for consistency)
    await this.redisService.setValue(
      redisKeys.LAST_DAILY_NOTIFY,
      statsDate.toISOString(),
    );

    // Reset stats for the new day
    await this.redisService.initializeDailyStats();
  }

  async checkAndRecoverMissedStats() {
    const lastExecutionISO = await this.redisService.getValue(
      redisKeys.LAST_DAILY_NOTIFY,
    );

    const yesterday = new Date();
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);
    yesterday.setUTCHours(0, 0, 0, 0); // Ensure it's exactly midnight UTC

    if (!lastExecutionISO) {
      console.warn(
        `No previous execution found, setting to ${yesterday.toISOString()}`,
      );
      await this.redisService.setValue(
        redisKeys.LAST_DAILY_NOTIFY,
        yesterday.toISOString(),
      );
      return; // No need to recover anything yet
    }

    const lastExecutionDate = parseISO(lastExecutionISO);
    lastExecutionDate.setUTCHours(0, 0, 0, 0); // Normalize time

    // Determine the day that needs to be processed (day after lastExecutionDate)
    const dayToRecover = addDays(lastExecutionDate, 1);

    console.log('Last Execution:', lastExecutionISO);
    console.log('Day to Recover:', dayToRecover);
    console.log('Yesterday:', yesterday);

    // If the missing day is before or equal to yesterday, process it
    if (
      isBefore(dayToRecover, yesterday) ||
      dayToRecover.getTime() === yesterday.getTime()
    ) {
      console.warn(
        `Missed daily stats update for ${dayToRecover.toISOString()}, recovering...`,
      );
      await this.dailyStatsClosing(dayToRecover.toISOString());

      // Update Redis to mark the recovered date as processed
      await this.redisService.setValue(
        redisKeys.LAST_DAILY_NOTIFY,
        yesterday.toISOString(),
      );
    } else {
      this.logger.log(
        `Daily stats for ${yesterday.toISOString()} have already been processed.`,
      );
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async notifyAboutSubscriptionPayment() {
    const now = new Date();

    const todayStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      0,
      0,
      0,
      0,
    ).toISOString();
    const todayEnd = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      23,
      59,
      59,
      999,
    ).toISOString();

    const usersToNotify = await this.usersService.findAll({
      date: UserSearchPath.SubscriptionNextPayment,
      fromDate: todayStart,
      toDate: todayEnd,
      limit: 10000,
    });

    // Create an array of promises for sending notifications
    const notificationPromises = usersToNotify.data.map(async (user) => {
      const promises = [];
      const userLanguage = user.language || Languages.EN;
      const message = this.i18nService.t(
        I18nKeys.MESSAGES_SUBSCRIPTION_EXPIRING,
        {
          lang: userLanguage,
          args: {
            subscription: user.subscription.plan,
          },
        },
      );

      if (user.telegram?.chatId) {
        promises.push(
          this.notificationBotService.sendMessageToUser(user.telegram, message),
        );
      }

      if (user.discord?.userId) {
        promises.push(
          this.discordService.sendDirectMessage(user.discord.userId, message),
        );
      }

      return Promise.all(promises); // Ensure all messages for this user are sent in parallel
    });

    // Wait for all notifications to be sent
    await Promise.all(notificationPromises);

    console.log('All notifications sent.');
  }
}
