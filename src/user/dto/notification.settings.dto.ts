import { Optional } from '@nestjs/common';
import { Prop } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';

export class NotificationSettings {
  @ApiProperty({
    description: 'Telegram username of the user',
    example: 'john_doe',
    required: false,
  })
  @Optional()
  @Prop({ required: false })
  username?: string;

  @ApiProperty({
    description: 'Telegram chat ID of the user',
    example: '1234567890',
    required: false,
  })
  @Optional()
  @Prop({ required: false })
  chatId?: string;
}
