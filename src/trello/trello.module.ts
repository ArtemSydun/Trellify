import { Module } from '@nestjs/common';
import { TrelloService } from './services/trello.service';
import { TrelloController } from './controllers/trello.controller';
import { UserModule } from 'src/user/user.module';
import { HttpModule } from '@nestjs/axios';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  imports: [UserModule, HttpModule, AuthModule],
  controllers: [TrelloController],
  providers: [TrelloService],
})
export class TrelloModule { }
