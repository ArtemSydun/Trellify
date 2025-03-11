import { Optional } from '@nestjs/common';
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
  @Optional()
  userId?: string | null;

  @ApiProperty({
    description: 'Discord username associated with the user',
    example: 'DiscordUsername | null',
    required: false,
    nullable: true,
  })
  @Prop({ required: false })
  @Optional()
  username?: string | null;

  @Prop({
    default: () => new Date(),
    required: false,
  })
  @Optional()
  updatedAt?: Date;
}
