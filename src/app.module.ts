import { Module } from '@nestjs/common';
import { DatabaseModule } from './database/database.module';
import { ConfigModule } from '@nestjs/config';
import { UsersModule } from './user/users.module';
import { TrelloModule } from './trello/trello.module';
import { AuthModule } from './auth/auth.module';
import { TelegramModule } from './telegram/telegram.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [`.env.${process.env.NODE_ENV}`],
    }),
    DatabaseModule,
    AuthModule,
    UsersModule,
    TrelloModule,
    TelegramModule
  ],
  controllers: [],
  providers: [],
})
export class AppModule { }
