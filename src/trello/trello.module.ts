import { forwardRef, Module } from '@nestjs/common';
import { TrelloService } from './services/trello.service';
import { UsersModule } from 'src/user/users.module';
import { AuthModule } from 'src/auth/auth.module';
import { TrelloMembersController } from './controllers/trello.members.controller';
import { TrelloWebhooksController } from './controllers/trello.webhooks.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Webhook, WebhookSchema } from './entities/webhook.entity';
import { TrelloWebhookRepository } from './repositories/webhook.repository';

@Module({
  imports: [
    forwardRef(() => UsersModule),
    forwardRef(() => AuthModule),
    MongooseModule.forFeature([{ name: Webhook.name, schema: WebhookSchema }]),

  ],
  controllers: [TrelloMembersController, TrelloWebhooksController],
  providers: [TrelloService, TrelloWebhookRepository],
  exports: [TrelloService, TrelloWebhookRepository]
})
export class TrelloModule { }
