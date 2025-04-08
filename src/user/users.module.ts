import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from 'src/auth/auth.module';
import { SharedConfigService } from 'src/config/services/shared.config.service';
import { DiscordModule } from 'src/discord/discord.module';
import { MailerModule } from 'src/mailer/mailer.module';
import { RedisModule } from 'src/redis/redis.module';
import { SubscriptionModule } from 'src/subscription/subscription.module';
import { TelegramModule } from 'src/telegram/telegram.module';
import { TrelloModule } from 'src/trello/trello.module';
import { UsersController } from './controllers/users.controller';
import { User, UserSchema } from './entities/user.entity';
import { UsersRepository } from './repositories/users.repository';
import { UsersService } from './services/users.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    MailerModule,
    RedisModule,
    forwardRef(() => AuthModule),
    forwardRef(() => TrelloModule),
    forwardRef(() => TelegramModule),
    forwardRef(() => SubscriptionModule),
    DiscordModule,
  ],
  controllers: [UsersController],
  providers: [UsersService, UsersRepository, SharedConfigService],
  exports: [UsersService, UsersRepository],
})
export class UsersModule {}
