import { Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';

@Schema({ timestamps: true })
export class Subscription {
  @ApiProperty({ description: 'Unique identifier for the subscription' })
  id: string;

  @ApiProperty({ description: 'Name of the subscription plan' })
  name: string;

  @ApiProperty({
    description: 'Price of the subscription in USD',
    example: 3,
  })
  price: number;

  @ApiProperty({ description: 'List of subscriber IDs', type: [String] })
  subscribers: string[];

  @ApiProperty({
    description: 'Date when the subscription plan was created',
    example: new Date(),
  })
  createdAt?: Date;

  @ApiProperty({
    description: 'Date when the subscription plan was last updated',
    example: new Date(),
  })
  updatedAt?: Date;
}

export const SubscriptionSchema = SchemaFactory.createForClass(Subscription);
