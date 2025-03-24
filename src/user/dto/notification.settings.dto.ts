import { Optional } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';

export class NotificationSettings {
  @ApiProperty({
    description: 'Telegram username of the user',
    example: 'john_doe',
    required: false,
  })
  @Optional()
  username?: string;

  @ApiProperty({
    description: 'Telegram chat ID of the user',
    example: '1234567890',
    required: false,
  })
  @Optional()
  chatId?: string;
}
