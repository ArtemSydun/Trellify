import { randomUUID } from 'crypto';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { Languages } from 'src/common/enums/languages.enum';
import { TelegramSettings } from '../dto/telegram.settings.dto';
import { TrelloSettings } from '../dto/trello.settings.dto';
import { UserRoles } from '../enums/role.enum';

@Schema({ timestamps: true })
export class User {
  @ApiProperty({
    description: 'Unique identifier for the user',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @Prop({ default: randomUUID() })
  id: string;

  @ApiProperty({
    description: 'Email address of the user',
    example: 'john.doe@example.com',
    required: true,
  })
  @Prop({ required: true })
  email: string;

  @Prop({ required: true })
  password: string;

  @ApiProperty({
    description: 'Role of the user in the application',
    example: 'user',
    enum: UserRoles,
    default: UserRoles.user,
  })
  @Prop({ type: String, enum: UserRoles, default: UserRoles.user })
  role: UserRoles;

  @ApiProperty({
    description: 'Trello settings associated with the user (optional)',
    type: TrelloSettings,
    required: false,
  })
  @Prop({ type: TrelloSettings, required: false })
  trello: TrelloSettings;

  @ApiProperty({
    description: 'Telegram settings associated with the user (optional)',
    type: TelegramSettings,
    required: false,
  })
  @Prop({ type: TelegramSettings, required: false })
  telegram: TelegramSettings;

  @ApiProperty({
    description: 'Language of telegram notifications',
    example: Languages.EN,
    enum: Languages,
    default: Languages.EN,
  })
  @Prop({ type: String, enum: Languages, default: Languages.EN })
  language: Languages;

  @ApiProperty({
    description: 'Date of last user login',
    example: new Date(),
    default: new Date(),
  })
  @Prop({ type: Date, default: new Date() })
  lastLoginDate: Date;

  @ApiProperty({
    description:
      'Date of last user activity date (updating something, last notification send)',
    example: new Date(),
    default: new Date(),
  })
  @Prop({ type: Date, default: new Date() })
  lastActivityDate: Date;

  @ApiProperty({
    description: 'Date when the user was created',
    example: new Date(),
  })
  createdAt?: Date;

  @ApiProperty({
    description: 'Date when the user was last updated',
    example: new Date(),
  })
  updatedAt?: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);
