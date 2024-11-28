import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger'; // Import ApiProperty from swagger
import { randomUUID } from 'crypto';
import { WebhookInterface } from 'src/trello/interfaces/webhook.interface';

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

  @ApiProperty({
    description: 'Trello authentication token of the user',
    example: 'TrelloToken123',
    required: false,
  })
  @Prop({ required: false })
  trelloToken: string;

  @ApiProperty({
    description: 'Trello user ID associated with the user',
    example: 'TrelloUser123',
    required: false,
  })
  @Prop({ required: false })
  trelloUserId: string;

  @ApiProperty({
    description: 'List of webhooks for the user',
    type: [String],
    required: false,
  })
  @Prop({ required: false, default: [] })
  webhooks: string[];

  @ApiProperty({
    description: 'Telegram username of the user',
    example: 'john_doe',
    required: false,
  })
  @Prop({ required: false })
  telegramUsername: string;

  @ApiProperty({
    description: 'Telegram chat ID of the user',
    example: '1234567890',
    required: false,
  })
  @Prop({ required: false })
  telegramChatId: string;
}

export const UserSchema = SchemaFactory.createForClass(User);
