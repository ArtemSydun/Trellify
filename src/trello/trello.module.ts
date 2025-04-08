import { forwardRef, Module } from '@nestjs/common';

import { MongooseModule } from '@nestjs/mongoose';

import * as ApiServices from '@trello/api';
import * as Controllers from '@trello/controllers';
import * as LogicServices from '@trello/logic';
import { AuthModule } from 'src/auth/auth.module';
import { DiscordModule } from 'src/discord/discord.module';
import { RedisModule } from 'src/redis/redis.module';
import { SubscriptionModule } from 'src/subscription/subscription.module';
import { TelegramModule } from 'src/telegram/telegram.module';
import { UsersModule } from 'src/user/users.module';
import { SharedConfigService } from '../config/services/shared.config.service';
import { Webhook, WebhookSchema } from './entities/webhook.entity';
import { TrelloWebhookRepository } from './repositories/webhook.repository';

@Module({
  imports: [
    forwardRef(() => UsersModule),
    forwardRef(() => AuthModule),
    MongooseModule.forFeature([{ name: Webhook.name, schema: WebhookSchema }]),
    forwardRef(() => TelegramModule),
    DiscordModule,
    forwardRef(() => SubscriptionModule),
    forwardRef(() => RedisModule),
  ],
  controllers: [
    Controllers.TrelloWebhooksController,
    Controllers.TrelloBoardsController,
    Controllers.TrelloCardsController,
    Controllers.TrelloMembersController,
    Controllers.TrelloTokensController,
  ],
  providers: [
    LogicServices.TrelloWebhooksLogicService,
    LogicServices.TrelloTokensLogicService,
    LogicServices.TrelloBoardsLogicService,
    LogicServices.TrelloCardsLogicService,
    LogicServices.TrelloMembersLogicService,
    LogicServices.TrelloActionsLogicService,
    ApiServices.TrelloWebhooksApiService,
    ApiServices.TrelloTokensApiService,
    ApiServices.TrelloBoardsApiService,
    ApiServices.TrelloCardsApiService,
    ApiServices.TrelloMembersApiService,
    ApiServices.TrelloBatchApiService,
    SharedConfigService,
    TrelloWebhookRepository,
  ],
  exports: [
    LogicServices.TrelloWebhooksLogicService,
    LogicServices.TrelloTokensLogicService,
    LogicServices.TrelloBoardsLogicService,
    LogicServices.TrelloCardsLogicService,
    LogicServices.TrelloActionsLogicService,
    LogicServices.TrelloMembersLogicService,
    ApiServices.TrelloWebhooksApiService,
    ApiServices.TrelloTokensApiService,
    ApiServices.TrelloBoardsApiService,
    ApiServices.TrelloCardsApiService,
    ApiServices.TrelloMembersApiService,
    ApiServices.TrelloBatchApiService,
    SharedConfigService,
    TrelloWebhookRepository,
  ],
})
export class TrelloModule {}
