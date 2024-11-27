import { PartialType } from '@nestjs/mapped-types';
import { CreateUserDto } from './create-user.dto';
import { Optional } from '@nestjs/common';
import { WebhookInterface } from 'src/trello/interfaces/webhook.interface';

export class UpdateUserDto extends PartialType(CreateUserDto) {
    @Optional()
    trelloToken?: string;

    @Optional()
    trelloUserId?: string;

    @Optional()
    webhooks?: WebhookInterface[];

    @Optional()
    telegramUsername?: string;

    @Optional()
    telegramChatId?: string;
}
