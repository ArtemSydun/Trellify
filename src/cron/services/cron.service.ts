import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { TrelloBoardsApiService } from '@trello/api';
import { TrelloWebhooksLogicService } from '@trello/logic';
import { differenceInDays, format } from 'date-fns';
import { decryptText } from 'src/common/helpers/hashing';
import { SharedConfigService } from 'src/config/shared.config.service';
import { redisKeysEnum } from 'src/redis/enums/redis-keys.enum';
import { RedisService } from 'src/redis/services/redis.service';
import { AdminBotService } from 'src/telegram/admin-bot/admin-bot.service';
import { TrelloBoardField } from 'src/trello/enums/trello.model.fields.enum';
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

  @Cron('55 23 * * *')
  async dailyStatsUpdate() {
    const startOfToday = new Date();
    startOfToday.setUTCHours(0, 0, 0, 0);

    const formattedDate = format(startOfToday, 'dd-MM-yyyy');

    const usersLoggedInToday = await this.usersService.findAll({
      date: 'lastLoginDate',
      fromDate: startOfToday.toISOString(),
    });

    const dailyStats = JSON.parse(
      await this.redisService.getValue(redisKeysEnum.DAILY_STATS),
    );

    const message = await this.adminBotService.dailyStatsNotification(
      formattedDate,
      { ...dailyStats, uniqueUsers: usersLoggedInToday.total },
    );

    await this.adminBotService.notifyAdmins(message);

    // Store the last execution date
    await this.redisService.setValue(
      redisKeysEnum.LAST_DAILY_STATS_REFRESH,
      formattedDate,
    );

    // Reset stats
    await this.redisService.initializeDailyStats();
  }

  async checkAndRecoverMissedStats() {
    const lastExecution = await this.redisService.getValue(
      redisKeysEnum.LAST_DAILY_STATS_REFRESH,
    );

    const yesterday = new Date();
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);
    yesterday.setUTCHours(0, 0, 0, 0);

    const formattedYesterday = format(yesterday, 'dd-MM-yyyy');

    if (!lastExecution || lastExecution !== formattedYesterday) {
      console.warn(
        `Missed daily stats update for ${formattedYesterday}, recovering...`,
      );
      await this.dailyStatsUpdate();
    }
  }
}
