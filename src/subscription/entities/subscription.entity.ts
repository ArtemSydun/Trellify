import { randomUUID } from 'crypto';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ValidateNested } from 'class-validator';
import { NotificationBooleansDto } from 'src/trello/dto/notifications.dto';
import { SubscriptionPlans } from '../enum/subscription-plan.enum';

@Schema({ timestamps: true })
export class Subscription {
  @ApiProperty({ description: 'Unique identifier for the subscription' })
  @Prop({ default: () => randomUUID() })
  id: string;

  @ApiProperty({
    description: 'Name of the subscription plan',
    enum: SubscriptionPlans,
  })
  @Prop({ required: true, enum: SubscriptionPlans })
  name: string;

  @ApiProperty({
    description: 'Price of the subscription in USD',
    example: 3,
  })
  @Prop({ required: true })
  price: number;

  @ApiProperty({ description: 'List of subscriber IDs', type: [String] })
  @Prop({ type: [String], default: [] })
  subscribers: string[];

  @ApiProperty({
    description: 'Notifications choosen by user',
    type: NotificationBooleansDto,
  })
  @ValidateNested()
  @Type(() => NotificationBooleansDto)
  @Prop({ type: NotificationBooleansDto, default: [] })
  notifications: NotificationBooleansDto;

  @ApiProperty({
    description: 'Date when the subscription plan was created',
    example: new Date(),
  })
  @Prop({ type: Date })
  createdAt?: Date;

  @ApiProperty({
    description: 'Date when the subscription plan was last updated',
    example: new Date(),
  })
  @Prop({ type: Date })
  updatedAt?: Date;
}

export const SubscriptionSchema = SchemaFactory.createForClass(Subscription);
