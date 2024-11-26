import { forwardRef, Module } from '@nestjs/common';
import { TrelloService } from './services/trello.service';
import { UserModule } from 'src/user/user.module';
import { AuthModule } from 'src/auth/auth.module';
import { TrelloMembersController } from './controllers/trello.members.controller';
import { TrelloWebhooksController } from './controllers/trello.webhooks.controller';

@Module({
  imports: [forwardRef(() => UserModule), AuthModule],
  controllers: [TrelloMembersController, TrelloWebhooksController],
  providers: [TrelloService],
  exports: [TrelloService]
})
export class TrelloModule { }
