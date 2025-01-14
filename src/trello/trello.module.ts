import { forwardRef, Module } from '@nestjs/common';

import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from 'src/auth/auth.module';
import { TelegramModule } from 'src/telegram/telegram.module';
import { UsersModule } from 'src/user/users.module';
import { SharedConfigService } from '../config/shared.config.service';
import { TrelloBoardsController } from './controllers/trello.boards.controller';
import { TrelloCardsController } from './controllers/trello.cards.controller';
import { TrelloMembersController } from './controllers/trello.members.controller';
import { TrelloTokensController } from './controllers/trello.tokens.controller';
import { TrelloWebhooksController } from './controllers/trello.webhooks.controller';
import { Webhook, WebhookSchema } from './entities/webhook.entity';
import { TrelloWebhookRepository } from './repositories/webhook.repository';

import { TrelloBoardsApiService } from './services/api/trello.boards.api.service';
import { TrelloCardsApiService } from './services/api/trello.cards.api.service';
import { TrelloMembersApiService } from './services/api/trello.members.api.service';
import { TrelloTokensApiService } from './services/api/trello.tokens.api.service';
import { TrelloWebhooksApiService } from './services/api/trello.webhooks.api.service';
import { TrelloActionsLogicService } from './services/logic/trello.actions.logic.service';
import { TrelloBoardsLogicService } from './services/logic/trello.boards.logic.service';
import { TrelloCardsLogicService } from './services/logic/trello.cards.logic.service';
import { TrelloMembersLogicService } from './services/logic/trello.members.logic.service';
import { TrelloTokensLogicService } from './services/logic/trello.tokens.logic.service';
import { TrelloWebhooksLogicService } from './services/logic/trello.webhooks.logic.service';

@Module({
  imports: [
    forwardRef(() => UsersModule),
    forwardRef(() => AuthModule),
    MongooseModule.forFeature([{ name: Webhook.name, schema: WebhookSchema }]),
    TelegramModule,
  ],
  controllers: [
    TrelloWebhooksController,
    TrelloBoardsController,
    TrelloCardsController,
    TrelloMembersController,
    TrelloTokensController,
  ],
  providers: [
    TrelloWebhooksLogicService,
    TrelloTokensLogicService,
    TrelloBoardsLogicService,
    TrelloCardsLogicService,
    TrelloMembersLogicService,
    TrelloActionsLogicService,
    TrelloWebhooksApiService,
    TrelloTokensApiService,
    TrelloBoardsApiService,
    TrelloCardsApiService,
    TrelloMembersApiService,
    SharedConfigService,
    TrelloWebhookRepository,
  ],
  exports: [
    TrelloWebhooksLogicService,
    TrelloTokensLogicService,
    TrelloBoardsLogicService,
    TrelloCardsLogicService,
    TrelloActionsLogicService,
    TrelloMembersLogicService,
    TrelloWebhooksApiService,
    TrelloTokensApiService,
    TrelloBoardsApiService,
    TrelloCardsApiService,
    TrelloMembersApiService,
    SharedConfigService,
    TrelloWebhookRepository,
  ],
})
export class TrelloModule {}
