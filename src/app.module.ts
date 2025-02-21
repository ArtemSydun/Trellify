import * as path from 'path';
import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { I18nMiddleware, I18nModule, QueryResolver } from 'nestjs-i18n';
import { AuthModule } from './auth/auth.module';
import { CronModule } from './cron/cron.module';
import { DatabaseModule } from './database/database.module';
import { DistributionModule } from './distribution/distribution.module';
import { TelegramModule } from './telegram/telegram.module';
import { TrelloModule } from './trello/trello.module';
import { UsersModule } from './user/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [`.env.${process.env.NODE_ENV}`],
    }),
    DatabaseModule,
    //number of requests for route and each user per minute
    ThrottlerModule.forRoot([
      {
        ttl: (parseInt(process.env.API_REQUEST_LIMIT) || 10) * 1000,
        limit: parseInt(process.env.API_REQUEST_LIMIT) || 20,
      },
    ]),
    I18nModule.forRoot({
      fallbackLanguage: 'en',
      loaderOptions: {
        path: path.join(__dirname, '/locales/'),
        watch: true,
      },
      resolvers: [new QueryResolver(['lang'])],
    }),
    AuthModule,
    UsersModule,
    TrelloModule,
    TelegramModule,
    ScheduleModule.forRoot(),
    CronModule,
    DistributionModule,
  ],
  controllers: [],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(I18nMiddleware).forRoutes('*');
  }
}
