import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { TrelloBoardsApiService } from '@trello/api';
import { TrelloWebhooksLogicService } from '@trello/logic';
import { differenceInDays } from 'date-fns';
import { decryptText } from 'src/common/helpers/hashing';
import { SharedConfigService } from 'src/config/shared.config.service';
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
    private readonly sharedConfigService: SharedConfigService,
  ) {
    this.encryptionKey = this.sharedConfigService.getEncryptionKey();
  }

  @Cron(CronExpression.EVERY_WEEK)
  async clearUnactiveWebhooks() {
    try {
      const webhooks = await this.trelloWebhooksLogicService.findAllWebhooks();

      const currentDate = new Date();

      const unactiveWebhooks = [];
      for (const webhook of webhooks) {
        const decryptedAuthorToken = decryptText(
          webhook.authorToken,
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
    } catch (error) {
      console.error('Error in clearUnactiveBoards:', error.message);
    }
  }
}
