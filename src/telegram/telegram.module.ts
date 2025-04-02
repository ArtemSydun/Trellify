import { HttpModule } from '@nestjs/axios';
import { forwardRef, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TelegrafModule } from 'nestjs-telegraf';
import { configServiceKeys } from 'src/common/enums/config-service-keys.enum';
import { TrelloModule } from 'src/trello/trello.module';
import { UsersModule } from 'src/user/users.module';
import { session } from 'telegraf';
import { AdminBotService } from './admin-bot/admin-bot.service';
import { NotificationBotService } from './notification-bot/notification-bot.service';
import { DisconnectTgScene } from './notification-bot/scenes/disconnectTg.scene';
import { TelegramRateLimiterService } from './rate-limiter/telegram-rate-limiter.service';

@Module({
  imports: [
    TelegrafModule.forRootAsync({
      botName: 'notificationBot',
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        token: configService.get<string>(
          configServiceKeys.TELEGRAM_NOTIFICATION_BOT_TOKEN,
        ),
        middlewares: [session()],
      }),

      inject: [ConfigService],
    }),
    TelegrafModule.forRootAsync({
      botName: 'adminBot',
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        token: configService.get<string>(
          configServiceKeys.TELEGRAM_ADMIN_BOT_TOKEN,
        ),

        middlewares: [session()],
      }),
      inject: [ConfigService],
    }),

    forwardRef(() => UsersModule),
    forwardRef(() => TrelloModule),
    HttpModule,
  ],
  controllers: [],
  providers: [
    NotificationBotService,
    AdminBotService,
    DisconnectTgScene,
    TelegramRateLimiterService,
  ],
  exports: [NotificationBotService, AdminBotService],
})
export class TelegramModule {}
