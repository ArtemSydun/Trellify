import { Module } from '@nestjs/common';
import { SharedConfigService } from 'src/config/shared.config.service';
import { DiscordModule } from 'src/discord/discord.module';
import { RedisModule } from 'src/redis/redis.module';
import { SubscriptionModule } from 'src/subscription/subscription.module';
import { TelegramModule } from 'src/telegram/telegram.module';
import { TrelloModule } from 'src/trello/trello.module';
import { UsersModule } from 'src/user/users.module';
import { CronService } from './services/cron.service';

@Module({
  imports: [
    TrelloModule,
    UsersModule,
    RedisModule,
    TelegramModule,
    DiscordModule,
    SubscriptionModule,
  ],
  controllers: [],
  providers: [CronService, SharedConfigService],
})
export class CronModule {}
