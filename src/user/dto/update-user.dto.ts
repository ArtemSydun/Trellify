import { PartialType } from '@nestjs/mapped-types';
import { CreateUserDto } from './create-user.dto';
import { Optional } from '@nestjs/common';
import { WebhookInterface } from 'src/trello/interfaces/webhook.interface';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateUserDto extends PartialType(CreateUserDto) {
    @ApiPropertyOptional()
    @Optional()
    trelloToken?: string;

    @ApiPropertyOptional()
    @Optional()
    trelloUserId?: string;

    @ApiPropertyOptional({ type: [String]})
    @Optional()
    webhooks?: string[];

    @ApiPropertyOptional()
    @Optional()
    telegramUsername?: string;

    @ApiPropertyOptional()
    @Optional()
    telegramChatId?: string;
}
