import { Module } from '@nestjs/common';
import { TelegrafModule } from 'nestjs-telegraf';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TelegramController } from './telegram.controller';
import { TelegramService } from './telegram.service';

import { HttpModule } from '@nestjs/axios';
import { UsersModule } from 'src/user/users.module';
import { configServiceEnum } from 'src/common/enums/config.service.enum';

@Module({
  imports: [
    TelegrafModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        token: configService.get<string>(configServiceEnum.TELEGRAM_BOT_TOKEN),
      }),
      inject: [ConfigService],
    }),
    UsersModule,
    HttpModule
  ],
  controllers: [],
  providers: [TelegramService, TelegramController],
})
export class TelegramModule {}
