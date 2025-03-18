import { Optional } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';

export class DiscordSettings {
  @ApiProperty({
    description: 'Discord user ID associated with the user',
    example: 'DiscordId123 | null',
    required: false,
    nullable: true,
    type: String,
  })
  @Optional()
  userId?: string | null;

  @ApiProperty({
    description: 'Discord username associated with the user',
    example: 'DiscordUsername | null',
    required: false,
    nullable: true,
  })
  @Optional()
  username?: string | null;

  @Optional()
  updatedAt?: Date;
}
