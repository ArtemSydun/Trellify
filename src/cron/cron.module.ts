import { Module } from '@nestjs/common';
import { SharedConfigService } from 'src/config/shared.config.service';
import { TrelloModule } from 'src/trello/trello.module';
import { UsersModule } from 'src/user/users.module';
import { CronService } from './services/cron.service';

@Module({
  imports: [TrelloModule, UsersModule],
  controllers: [],
  providers: [CronService, SharedConfigService],
})
export class CronModule {}
