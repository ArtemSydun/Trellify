import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { TrelloService } from 'src/trello/services/trello.service';
import { WebhookService } from 'src/trello/services/webhook.service';
import { differenceInDays } from 'date-fns';
import { TrelloBoardField } from 'src/trello/enums/trello.model.fields.enum';
import { decryptText } from 'src/common/helpers/hashing';
import { SharedConfigService } from 'src/trello/services/shared.config.service';
import { TrelloApiService } from 'src/trello/services/trello.api.service';

@Injectable()
export class CronService {
    private readonly encryptionKey: string;
    private readonly logger = new Logger(CronService.name);
    constructor(
        @Inject(forwardRef(() => TrelloService))
        private readonly trelloService: TrelloService,
        private readonly trelloApiService: TrelloApiService,
        @Inject(forwardRef(() => WebhookService))
        private readonly webhookService: WebhookService,
        private readonly sharedConfigService: SharedConfigService,
    ) {
        this.encryptionKey = this.sharedConfigService.getEncryptionKey();
    }

    @Cron(CronExpression.EVERY_WEEK)
    async clearUnactiveBoards() {
        try {
            const webhooks = await this.webhookService.findAllWebhooks();

            const currentDate = new Date();

            const unactiveWebhooks = [];
            for (const webhook of webhooks) {
                const decryptedAuthorToken = decryptText(webhook.authorToken, this.encryptionKey);
                const dateLastActivity = await this.trelloApiService.fetchBoardField(
                    decryptedAuthorToken,
                    webhook.idModel,
                    TrelloBoardField.DATE_LAST_ACTIVITY,
                );

                if (!dateLastActivity) {
                    console.log(`No ${TrelloBoardField.DATE_LAST_ACTIVITY} for board ${webhook.boardName}`);
                    continue;
                }

                const dateLastActivityParsed = new Date(dateLastActivity._value);
                const daysSinceLastActivity = differenceInDays(currentDate, dateLastActivityParsed);

                // unactive for more than 30 days
                if (daysSinceLastActivity <= -30) {
                    unactiveWebhooks.push(webhook);
                }
            }

            const removePromises = unactiveWebhooks.map(async (webhook) => {
                try {
                    console.log(`Removing inactive webhook for board: ${webhook.boardName}`);
                    await this.webhookService.removeTrelloWebhook(webhook.id);
                    return webhook.boardName;
                } catch (error) {
                    console.error(`Error removing webhook for board ${webhook.boardName}:`, error.message);
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
