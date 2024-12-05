import { forwardRef, Module } from '@nestjs/common';


import { UsersService } from './services/users.service';

import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from './entities/user.entity';
import { MailerModule } from 'src/mailer/mailer.module';
import { AuthModule } from 'src/auth/auth.module';
import { TrelloModule } from 'src/trello/trello.module';
import { UsersController } from './controllers/users.controller';
import { UsersRepository } from './repositories/users.repository';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    MailerModule,
    forwardRef(() => AuthModule),
    forwardRef(() => TrelloModule),
  ],
  controllers: [UsersController],
  providers: [UsersService, UsersRepository],
  exports: [UsersService]
})
export class UsersModule { }
