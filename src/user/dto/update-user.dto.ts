import { PartialType } from '@nestjs/mapped-types';
import { CreateUserDto } from './create-user.dto';
import { Optional } from '@nestjs/common';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { TelegramSettings } from './telegram.settings.dto';
import { TrelloSettings } from './trello.settings.dto';

// @Optional() decorator for nested objects here do not work properly, nest js do not support it
// https://github.com/nestjs/swagger/issues/2382
export class UpdateUserDto extends PartialType(CreateUserDto) {
    @ApiPropertyOptional()
    @Optional()
    trello: TrelloSettings

    @ApiPropertyOptional({ type: TelegramSettings})
    @Optional()
    telegram: TelegramSettings
}
