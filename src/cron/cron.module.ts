import { Module } from '@nestjs/common';
import { CronService } from './services/cron.service';
import { TrelloModule } from 'src/trello/trello.module';
import { SharedConfigService } from 'src/config/shared.config.service';
import { UsersModule } from 'src/user/users.module';

@Module({
  imports: [TrelloModule, UsersModule],
  controllers: [],
  providers: [CronService, SharedConfigService],
})
export class CronModule { }
