import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { randomUUID } from 'crypto';
import { TelegramSettings } from '../dto/telegram.settings.dto';
import { TrelloSettings } from '../dto/trello.settings.dto';
import { UserRoles } from '../interfaces/role.enum';

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
  })
  @Prop({ required: true })
  email: string;

  @ApiProperty({
    description: 'Encrypted password of the user',
    example: 'encryptedPassword123',
  })
  @Prop({ required: true })
  password: string;

  @Prop({ type: String, enum: UserRoles, default: UserRoles.user })
  role: UserRoles

  @Prop({ type: TrelloSettings, required: false })
  trello: TrelloSettings;

  @Prop({ type: TelegramSettings, required: false })
  telegram: TelegramSettings;
}

export const UserSchema = SchemaFactory.createForClass(User);
