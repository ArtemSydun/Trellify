import { Optional } from '@nestjs/common';
import { PartialType } from '@nestjs/mapped-types';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { UserRoles } from '../enums/role.enum';
import { CreateUserDto } from './create-user.dto';
import { TelegramSettings } from './telegram.settings.dto';
import { TrelloSettings } from './trello.settings.dto';

// @Optional() decorator for nested objects here do not work properly, nest js do not support it
// https://github.com/nestjs/swagger/issues/2382
export class UpdateUserDto extends PartialType(CreateUserDto) {
  @ApiPropertyOptional()
  @Optional()
  trello?: TrelloSettings;

  @ApiPropertyOptional({ type: TelegramSettings })
  @Optional()
  telegram?: TelegramSettings;

  @ApiPropertyOptional({ type: String, enum: UserRoles })
  @Optional()
  role?: UserRoles;

  @ApiPropertyOptional({ type: Date })
  @Optional()
  lastLoginDate?: Date;

  @ApiPropertyOptional({ type: Date })
  @Optional()
  lastActivityDate?: Date;
}
