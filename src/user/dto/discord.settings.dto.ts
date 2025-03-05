import { Prop } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';

export class DiscordSettings {
  @ApiProperty({
    description: 'Discord user ID associated with the user',
    example: 'DiscordId123 | null',
    required: false,
    nullable: true,
    type: String,
  })
  @Prop({ required: false })
  userId?: string | null;

  @ApiProperty({
    description: 'Discord username associated with the user',
    example: 'DiscordUsername | null',
    required: false,
    nullable: true,
  })
  @Prop({ required: false })
  username?: string | null;

  @ApiProperty({
    description: 'Timestamp of the last update to the Discord settings',
    example: '2025-01-02T15:46:09.123Z',
    required: false,
  })
  @Prop({
    default: () => new Date(),
    required: false,
  })
  updatedAt?: Date;
}
