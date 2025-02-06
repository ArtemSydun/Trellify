import { HttpModule } from '@nestjs/axios';
import { forwardRef, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TelegrafModule } from 'nestjs-telegraf';
import { configServiceEnum } from 'src/common/enums/config.service.enum';
import { TrelloModule } from 'src/trello/trello.module';
import { UsersModule } from 'src/user/users.module';
import { session } from 'telegraf';
import { TelegramController } from './telegram.controller';
import { TelegramService } from './telegram.service';

@Module({
  imports: [
    TelegrafModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        token: configService.get<string>(configServiceEnum.TELEGRAM_BOT_TOKEN),
        middlewares: [session()],
      }),
      inject: [ConfigService],
    }),
    forwardRef(() => UsersModule),
    forwardRef(() => TrelloModule),
    HttpModule,
  ],
  controllers: [],
  providers: [TelegramService, TelegramController],
  exports: [TelegramService],
})
export class TelegramModule {}
