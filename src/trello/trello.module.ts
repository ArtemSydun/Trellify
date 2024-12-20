import { forwardRef, Module } from '@nestjs/common';

import { UsersModule } from 'src/user/users.module';
import { AuthModule } from 'src/auth/auth.module';
import { TrelloWebhooksController } from './controllers/trello.webhooks.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Webhook, WebhookSchema } from './entities/webhook.entity';
import { TrelloWebhookRepository } from './repositories/webhook.repository';

import { SharedConfigService } from '../config/shared.config.service';
import { TelegramModule } from 'src/telegram/telegram.module';
import { TrelloWebhooksLogicService } from './services/logic/trello.webhooks.logic.service';
import { TrelloWebhooksApiService } from './services/api/trello.webhooks.api.service';
import { TrelloTokensLogicService } from './services/logic/trello.tokens.logic.service';
import { TrelloBoardsLogicService } from './services/logic/trello.boards.logic.service';
import { TrelloCardsLogicService } from './services/logic/trello.cards.logic.service';
import { TrelloActionsLogicService } from './services/logic/trello.actions.logic.service';
import { TrelloTokensApiService } from './services/api/trello.tokens.api.service';
import { TrelloBoardsApiService } from './services/api/trello.boards.api.service';
import { TrelloCardsApiService } from './services/api/trello.cards.api.service';
import { TrelloBoardsController } from './controllers/trello.boards.controller';
import { TrelloMembersController } from './controllers/trello.members.controller';
import { TrelloTokensController } from './controllers/trello.tokens.controller';
import { TrelloCardsController } from './controllers/trello.cards.controller';
import { TrelloMembersLogicService } from './services/logic/trello.members.logic.service';
import { TrelloMembersApiService } from './services/api/trello.members.api.service';


@Module({
  imports: [
    forwardRef(() => UsersModule),
    forwardRef(() => AuthModule),
    MongooseModule.forFeature([{ name: Webhook.name, schema: WebhookSchema }]),
    TelegramModule
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
    TrelloWebhookRepository
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
    TrelloWebhookRepository
  ]
})
export class TrelloModule { }
