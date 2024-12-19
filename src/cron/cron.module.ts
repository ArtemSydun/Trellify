import { Module } from '@nestjs/common';
import { CronService } from './services/cron.service';
import { TrelloModule } from 'src/trello/trello.module';
import { SharedConfigService } from 'src/common/config/shared.config.service';

@Module({
  imports: [TrelloModule],
  controllers: [],
  providers: [CronService, SharedConfigService],
})
export class CronModule {}
