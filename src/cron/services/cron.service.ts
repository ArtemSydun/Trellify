import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { TrelloBoardsApiService } from '@trello/api';
import { TrelloWebhooksLogicService } from '@trello/logic';
import {
  addDays,
  subDays,
  differenceInDays,
  format,
  isBefore,
  parseISO,
  formatISO,
  startOfDay,
} from 'date-fns';
import { I18nService } from 'nestjs-i18n';
import { I18nKeys } from 'src/common/enums/i18n-keys.enum';
import { Languages } from 'src/common/enums/languages.enum';
import { decryptText } from 'src/common/helpers/hashing';
import { SharedConfigService } from 'src/config/shared.config.service';
import { DiscordService } from 'src/discord/discord.service';
import { periodStatsKeys } from 'src/redis/enums/daily-stats-keys.enum';
import { redisKeys } from 'src/redis/enums/redis-keys.enum';
import { RedisService } from 'src/redis/services/redis.service';
import { SubscriptionService } from 'src/subscription/services/subscription.service';
import { AdminBotService } from 'src/telegram/admin-bot/admin-bot.service';
import { NotificationBotService } from 'src/telegram/notification-bot/notification-bot.service';
import { TrelloBoardField } from 'src/trello/enums/trello.model.fields.enum';
import { User } from 'src/user/entities/user.entity';
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
    private readonly subscriptionService: SubscriptionService,
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
        let dateLastActivity;

        try {
          dateLastActivity = await this.trelloBoardsApiService.fetchBoardField(
            decryptedAuthorToken,
            webhook.idModel,
            TrelloBoardField.DATE_LAST_ACTIVITY,
          );
        } catch (error) {
          this.logger.warn(
            `Webhook for board ${webhook.boardName} check fails: `,
            error.response.message,
          );
          unactiveWebhooks.push(webhook);
        }

        if (!dateLastActivity) {
          console.warn(
            `No ${TrelloBoardField.DATE_LAST_ACTIVITY} for board ${webhook.boardName}. Board does not exist, or it is fresh board with no`,
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

        //if webhook has 1 subscriber and disconnected telegram and discord
        try {
          if (webhook.subscribers.length === 1) {
            const connectedUser = await this.usersService.findUserByTrelloId(
              webhook.subscribers[0].trelloUserId,
            );

            const daysSinceTelegramConnected = differenceInDays(
              currentDate,
              connectedUser.telegram.updatedAt,
            );

            const daysSinceDiscordConnected = differenceInDays(
              currentDate,
              connectedUser.discord.updatedAt,
            );

            if (
              daysSinceTelegramConnected >= 30 &&
              daysSinceDiscordConnected >= 30 &&
              !connectedUser.telegram.chatId &&
              !connectedUser.discord.userId
            ) {
              unactiveWebhooks.push(webhook);
              continue;
            }
          }
        } catch (err) {
          this.logger.warn(
            `Webhook ${webhook.boardName} only one subscriber was not found`,
            err.message || err.response || err.response.message,
          );
          unactiveWebhooks.push(webhook);
          continue;
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
          this.logger.error(`Error clearing webhook ${webhook.id}`);
        }
      });

      const removedWebhooks = await Promise.all(removePromises);
      console.log('Successfully removed inactive webhooks:', removedWebhooks);
    } catch (error) {
      console.error(
        'Weekly clearUnactiveWebhooks cron execution failed:',
        error.message || error.response.message,
      );
    }
    this.logger.log(`Unactive webhooks clear cron finished`);
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

  @Cron(CronExpression.EVERY_10_MINUTES)
  async subscriptionExpirationUpdate() {
    const fromDate = formatISO(startOfDay(subDays(new Date(), 3))); // 3 days ago at 00:00:00
    const toDate = new Date().toISOString();

    // Fetch expired users whose subscription is not yet marked as expired
    const expiredUsers = await this.usersService.findAll({
      date: UserSearchPath.SubscriptionNextPayment,
      fromDate,
      toDate,
      subscriptionExpired: false,
    });

    // Group users by their subscription plan name
    const usersBySubscriptions = expiredUsers.data.reduce(
      (acc, user) => {
        const planName = user.subscription?.plan;

        if (!planName) return acc; // Skip users without a subscription plan

        if (!acc[planName]) {
          acc[planName] = [];
        }

        acc[planName].push(user);
        return acc;
      },
      {} as Record<string, User[]>,
    );

    // Fetch all subscription plans
    const subscriptions = await this.subscriptionService.findAll();

    // Process all subscriptions concurrently
    await Promise.all(
      subscriptions.map(async (subscription) => {
        const planName = subscription.name;

        if (usersBySubscriptions[planName]) {
          const usersToUpdate = usersBySubscriptions[planName];

          // Update all users for this subscription concurrently
          await Promise.all(
            usersToUpdate.map((user) =>
              this.usersService.updateUser(user.id, {
                subscription: {
                  ...user.subscription,
                  expired: true,
                  nextPaymentDate: null,
                },
              }),
            ),
          );

          console.log(
            `Processed ${usersToUpdate.length} users for plan ${planName}.`,
          );
        }
      }),
    );

    console.log('Total expired subscriptions processed: ', expiredUsers.total);
  }

  //if server is down at this moment, it will send daily stats when the server will up
  //but if server was down more then one day, we do not guarantee
  //data accuracy, because loginnedUsers based on lastLoginDate of user object,
  @Cron('55 23 * * *')
  async dailyStatsClosing(formattedYesterday?: string) {
    let statsDate: Date;
    const totalUsers = await this.usersService.findTotal();

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

    // Get stored daily stats
    const dailyStats = JSON.parse(
      await this.redisService.getValue(redisKeys.DAILY_STATS),
    );

    // Generate notification message
    const message = await this.adminBotService.dailyStatsNotification(
      formattedDateForMessage,
      {
        loginnedUsers: dailyStats[periodStatsKeys.LOGINNED_USERS]?.length || 0,
        newUsers: dailyStats[periodStatsKeys.NEW_USERS]?.length || 0,
        deletedUsers: dailyStats[periodStatsKeys.DELETED_USERS]?.length || 0,
        contactUs: dailyStats[periodStatsKeys.CONTACT_US]?.length || 0,
        totalUsers: totalUsers || 0,
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

  //if server is down at this moment, it will send daily stats when the server will up
  //but if server was down more then one day, we do not guarantee
  //data accuracy, because loginnedUsers based on lastLoginDate of user object,
  @Cron('55 23 * * 0') // Runs every Sunday at 11:55 PM
  async weeklyStatsClosing(formattedDayOfWeekAgo?: string) {
    let statsDate: Date;
    const totalUsers = await this.usersService.findTotal();

    if (formattedDayOfWeekAgo) {
      // If a specific date is provided (for recovery), parse it correctly
      statsDate = parseISO(formattedDayOfWeekAgo);
    } else {
      // Calculate last Sunday
      statsDate = subDays(new Date(), new Date().getUTCDay());
      statsDate.setUTCHours(0, 0, 0, 0); // Midnight UTC
    }

    console.log('Processing weekly stats for:', statsDate.toISOString());

    // Calculate Monday of the same week (move back to start of the week)
    const startOfWeek = subDays(statsDate, 6); // Move from Sunday → Monday
    startOfWeek.setUTCHours(0, 0, 0, 0);

    // End of the week (Sunday)
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setUTCDate(startOfWeek.getUTCDate() + 6); // Move forward 6 days to reach Sunday
    endOfWeek.setUTCHours(23, 59, 59, 999);

    console.log('Start of week (Monday):', startOfWeek.toISOString());
    console.log('End of week (Sunday):', endOfWeek.toISOString());

    // Format date range for message
    const formattedStartDate = format(startOfWeek, 'dd-MM-yyyy'); // Monday
    const formattedEndDate = format(addDays(startOfWeek, 6), 'dd-MM-yyyy'); // Sunday
    const formattedDateRange = `${formattedStartDate} - ${formattedEndDate}`;

    // Get stored weekly stats
    const weeklyStats = JSON.parse(
      await this.redisService.getValue(redisKeys.WEEKLY_STATS),
    );

    // Generate notification message with correct date range
    const message = await this.adminBotService.weeklyStatsNotification(
      formattedDateRange, // Pass Monday → Sunday date range
      {
        loginnedUsers: weeklyStats[periodStatsKeys.LOGINNED_USERS]?.length || 0,
        newUsers: weeklyStats[periodStatsKeys.NEW_USERS]?.length || 0,
        deletedUsers: weeklyStats[periodStatsKeys.DELETED_USERS]?.length || 0,
        contactUs: weeklyStats[periodStatsKeys.CONTACT_US]?.length || 0,
        totalUsers: totalUsers || 0,
      },
    );

    // Notify admins
    await this.adminBotService.notifyAdmins(message);

    // Store last execution date in ISO format (for consistency)
    await this.redisService.setValue(
      redisKeys.LAST_WEEKLY_NOTIFY,
      statsDate.toISOString(),
    );

    // Reset stats for the new week
    await this.redisService.initializeWeeklyStats();
  }

  async checkAndRecoverMissedStats() {
    // Get last recorded daily and weekly execution dates
    const lastDailyExecutionISO = await this.redisService.getValue(
      redisKeys.LAST_DAILY_NOTIFY,
    );
    const lastWeeklyExecutionISO = await this.redisService.getValue(
      redisKeys.LAST_WEEKLY_NOTIFY,
    );

    // Get yesterday's date
    const yesterday = new Date();
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);
    yesterday.setUTCHours(0, 0, 0, 0);

    // Get last Sunday’s date
    const lastSunday = subDays(new Date(), new Date().getUTCDay()); // Moves back to last Sunday
    lastSunday.setUTCHours(0, 0, 0, 0);

    // ----------------------- DAILY STATS CHECK -----------------------
    if (!lastDailyExecutionISO) {
      console.warn(
        `No previous daily execution found, running for ${yesterday.toISOString()}`,
      );

      // Run daily stats and store the execution time
      await this.dailyStatsClosing(yesterday.toISOString());
      await this.redisService.setValue(
        redisKeys.LAST_DAILY_NOTIFY,
        yesterday.toISOString(),
      );
    } else {
      const lastDailyExecutionDate = parseISO(lastDailyExecutionISO);
      lastDailyExecutionDate.setUTCHours(0, 0, 0, 0); // Normalize time

      // Expected recovery date (should be yesterday)
      const dailyRecoveryDate = addDays(lastDailyExecutionDate, 1);

      if (
        isBefore(dailyRecoveryDate, yesterday) ||
        dailyRecoveryDate.getTime() === yesterday.getTime()
      ) {
        console.warn(
          `Missed daily stats update for ${dailyRecoveryDate.toISOString()}, recovering...`,
        );

        await this.dailyStatsClosing(dailyRecoveryDate.toISOString());

        // Update Redis to mark the recovered date as processed
        await this.redisService.setValue(
          redisKeys.LAST_DAILY_NOTIFY,
          yesterday.toISOString(),
        );
      } else {
        console.log(
          `Daily stats for ${yesterday.toISOString()} have already been processed.`,
        );
      }
    }

    // ----------------------- WEEKLY STATS CHECK -----------------------
    if (!lastWeeklyExecutionISO) {
      console.warn(
        `No previous weekly execution found, running for last Sunday: ${lastSunday.toISOString()}`,
      );

      // Run weekly stats and store the execution time
      await this.weeklyStatsClosing(lastSunday.toISOString());
      await this.redisService.setValue(
        redisKeys.LAST_WEEKLY_NOTIFY,
        lastSunday.toISOString(),
      );
    } else {
      const lastWeeklyExecutionDate = parseISO(lastWeeklyExecutionISO);
      lastWeeklyExecutionDate.setUTCHours(0, 0, 0, 0); // Normalize time

      // Check if the last recorded weekly execution is older than 7 days
      if (isBefore(lastWeeklyExecutionDate, subDays(lastSunday, 6))) {
        console.warn(
          `Missed weekly stats update for ${lastSunday.toISOString()}, recovering...`,
        );

        await this.weeklyStatsClosing(lastSunday.toISOString());

        // Update Redis to mark the recovered week as processed
        await this.redisService.setValue(
          redisKeys.LAST_WEEKLY_NOTIFY,
          lastSunday.toISOString(),
        );
      } else {
        console.log(
          `Weekly stats for ${lastSunday.toISOString()} have already been processed.`,
        );
      }
    }
  }
}
