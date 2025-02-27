import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from 'src/auth/auth.module';
import { SharedConfigService } from 'src/config/shared.config.service';
import { MailerModule } from 'src/mailer/mailer.module';
import { RedisModule } from 'src/redis/redis.module';
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
  ],
  controllers: [UsersController],
  providers: [UsersService, UsersRepository, SharedConfigService],
  exports: [UsersService, UsersRepository],
})
export class UsersModule {}
