import { Optional } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';

export class TelegramSettings {
  @ApiProperty({
    description: 'Telegram username of the user',
    example: 'john_doe | null',
    required: false,
    nullable: true,
  })
  @Optional()
  username?: string;

  @ApiProperty({
    description: 'Telegram chat ID of the user',
    example: 1234567890,
    required: false,
    nullable: true,
  })
  @Optional()
  chatId?: number;

  @Optional()
  updatedAt?: Date;
}
