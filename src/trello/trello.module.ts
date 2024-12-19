import { forwardRef, Module } from '@nestjs/common';
import { TrelloService } from './services/trello.service';
import { UsersModule } from 'src/user/users.module';
import { AuthModule } from 'src/auth/auth.module';
import { TrelloMembersController } from './controllers/trello.members.controller';
import { TrelloWebhooksController } from './controllers/trello.webhooks.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Webhook, WebhookSchema } from './entities/webhook.entity';
import { TrelloWebhookRepository } from './repositories/webhook.repository';
import { ActionsService } from './services/actions.service';
import { WebhookService } from './services/webhook.service';
import { SharedConfigService } from './services/shared.config.service';
import { TelegramModule } from 'src/telegram/telegram.module';
import { TrelloApiService } from './services/trello.api.service';

@Module({
  imports: [
    forwardRef(() => UsersModule),
    forwardRef(() => AuthModule),
    MongooseModule.forFeature([{ name: Webhook.name, schema: WebhookSchema }]),
    TelegramModule
  ],
  controllers: [TrelloMembersController, TrelloWebhooksController],
  providers: [TrelloService, TrelloApiService, TrelloWebhookRepository, ActionsService, WebhookService, SharedConfigService],
  exports: [TrelloService, TrelloApiService, TrelloWebhookRepository, ActionsService, WebhookService, SharedConfigService]
})
export class TrelloModule { }
