import { HttpModule } from '@nestjs/axios';
import { forwardRef, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TelegrafModule } from 'nestjs-telegraf';
import { configServiceEnum } from 'src/common/enums/config.service.enum';
import { TrelloModule } from 'src/trello/trello.module';
import { UsersModule } from 'src/user/users.module';
import { session } from 'telegraf';
import { AdminBotService } from './admin-bot/admin-bot.service';
import { NotificationBotService } from './notification-bot/notification-bot.service';

@Module({
  imports: [
    TelegrafModule.forRootAsync({
      botName: 'notificationBot',
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        token: configService.get<string>(
          configServiceEnum.TELEGRAM_NOTIFICATION_BOT_TOKEN,
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
          configServiceEnum.TELEGRAM_ADMIN_BOT_TOKEN,
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
  providers: [NotificationBotService, AdminBotService],
  exports: [NotificationBotService, AdminBotService],
})
export class TelegramModule {}
