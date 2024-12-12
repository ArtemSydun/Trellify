import { Module } from '@nestjs/common';
import { CronService } from './services/cron.service';

@Module({
  controllers: [],
  providers: [CronService],
})
export class CronModule {}
