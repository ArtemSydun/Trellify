import { HttpModule } from '@nestjs/axios';
import { forwardRef, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TelegrafModule } from 'nestjs-telegraf';
import {
  TelegrafI18nModule,
  TelegrafI18nMiddlewareProvider,
  TelegrafI18nContext,
} from 'nestjs-telegraf-i18n';
import { configServiceKeys } from 'src/common/enums/config-service-keys.enum';
import { RedisModule } from 'src/redis/redis.module';
import { TrelloModule } from 'src/trello/trello.module';
import { UsersModule } from 'src/user/users.module';
import { session } from 'telegraf';
import { AdminBotService } from './admin-bot/admin-bot.service';
import { NotificationBotService } from './notification-bot/notification-bot.service';
import { DisconnectTgScene } from './notification-bot/scenes/disconnectTg.scene';
import { TelegramRateLimiterService } from './rate-limiter/telegram-rate-limiter.service';

@Module({
  imports: [
    TelegrafI18nModule,
    TelegrafModule.forRootAsync({
      botName: 'notificationBot',
      imports: [ConfigModule],
      inject: [ConfigService, TelegrafI18nMiddlewareProvider],
      useFactory: async (
        configService: ConfigService,
        telegrafI18nMiddlewareProvider: TelegrafI18nMiddlewareProvider,
      ) => ({
        token: configService.get<string>(
          configServiceKeys.TELEGRAM_NOTIFICATION_BOT_TOKEN,
        ),
        options: {
          contextType: TelegrafI18nContext,
        },
        middlewares: [
          session(),
          telegrafI18nMiddlewareProvider.telegrafI18nMiddleware,
        ],
      }),
    }),
    TelegrafModule.forRootAsync({
      botName: 'adminBot',
      imports: [ConfigModule],
      inject: [ConfigService, TelegrafI18nMiddlewareProvider],
      useFactory: async (
        configService: ConfigService,
        telegrafI18nMiddlewareProvider: TelegrafI18nMiddlewareProvider,
      ) => ({
        token: configService.get<string>(
          configServiceKeys.TELEGRAM_ADMIN_BOT_TOKEN,
        ),

        options: {
          contextType: TelegrafI18nContext,
        },
        middlewares: [
          session(),
          telegrafI18nMiddlewareProvider.telegrafI18nMiddleware,
        ],
      }),
    }),

    forwardRef(() => UsersModule),
    forwardRef(() => TrelloModule),
    forwardRef(() => RedisModule),
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
