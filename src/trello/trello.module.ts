import { forwardRef, Module } from '@nestjs/common';
import { TrelloService } from './services/trello.service';
import { UserModule } from 'src/user/user.module';
import { AuthModule } from 'src/auth/auth.module';
import { TrelloMembersController } from './controllers/trello.members.controller';
import { TrelloWebhooksController } from './controllers/trello.webhooks.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { TrelloWebhook, TrelloWebhookSchema } from './entities/webhook.entity';
import { TrelloWebhookRepository } from './repositories/webhook.repository';

@Module({
  imports: [
    forwardRef(() => UserModule),
    forwardRef(() => AuthModule),
    MongooseModule.forFeature([{ name: TrelloWebhook.name, schema: TrelloWebhookSchema }]),

  ],
  controllers: [TrelloMembersController, TrelloWebhooksController],
  providers: [TrelloService, TrelloWebhookRepository],
  exports: [TrelloService, TrelloWebhookRepository]
})
export class TrelloModule { }
