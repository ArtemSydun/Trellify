import { Module } from '@nestjs/common';
import { CronService } from './services/cron.service';
import { TrelloModule } from 'src/trello/trello.module';

@Module({
  imports: [TrelloModule],
  controllers: [],
  providers: [CronService],
})
export class CronModule {}
