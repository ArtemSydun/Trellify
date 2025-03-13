import { randomUUID } from 'crypto';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { Languages } from 'src/common/enums/languages.enum';

@Schema({ timestamps: true, collection: 'distribution_subscribers' })
export class DistributionSubscriber {
  @ApiProperty({
    description: 'Unique identifier for the distribution subscriber',
    example: '6748311e20b49e848f710448',
  })
  @Prop({ default: () => randomUUID() })
  id: string;

  @ApiProperty({
    description: 'Id of trellify user id (null if is website visitor)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @Prop({ required: false, default: null })
  trellifyUserId: string | null;

  @ApiProperty({
    description: 'Email address of the distribution subscriber.',
    example: 'john.doe@example.com',
    required: true,
  })
  @Prop({ required: true })
  email: string;

  @ApiProperty({
    description: 'Language of distribution',
    example: Languages.EN,
    enum: Languages,
    default: Languages.EN,
  })
  @Prop({ type: String, enum: Languages, default: Languages.EN })
  language: Languages;

  @ApiProperty({
    description: 'User timezone (GMT +7)',
    example: 7,
    default: 0,
  })
  @Prop({ type: Number, default: 0 })
  timezone: number;

  @ApiProperty({
    description: 'Date of last distribution sent to user',
    example: new Date(),
    default: new Date(),
  })
  @Prop({ type: Date, default: null })
  lastMessageSent: Date | null;

  @ApiProperty({
    description: 'Date when the distribution subscription was created',
    example: new Date(),
  })
  createdAt?: Date;

  @ApiProperty({
    description: 'Date when the user was last updated',
    example: new Date(),
  })
  updatedAt?: Date;
}

export const DistributionSubscriberSchema = SchemaFactory.createForClass(
  DistributionSubscriber,
);
