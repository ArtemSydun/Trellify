import { randomUUID } from 'crypto';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';

@Schema({ timestamps: true, collection: 'paypal_webhooks' })
export class PaypalWebhook {
  @ApiProperty({ description: 'Unique identifier for the PaypalWebhook' })
  @Prop({ default: () => randomUUID() })
  id: string;

  @ApiProperty({ description: 'Paypal webhook id' })
  @Prop({ required: true })
  paypalWebhookId: string;

  @ApiProperty({ description: 'Paypal plan id' })
  @Prop({ required: true })
  paypalPlanId: string;

  @ApiProperty({
    description: 'Id of trellify plan',
  })
  @Prop({ required: true })
  trellifyPlanId: string;

  @ApiProperty({
    description:
      'Callback URL that Paypal will send events to when they occur on the associated model.',
    example: 'https://api-link/paypal/webhook/I12415321',
  })
  @Prop({ required: true })
  callbackURL: string;

  @ApiProperty({
    description: 'Date when the PaypalWebhook plan was created',
    example: new Date(),
  })
  @Prop({ type: Date })
  createdAt?: Date;

  @ApiProperty({
    description: 'Date when the PaypalWebhook plan was last updated',
    example: new Date(),
  })
  @Prop({ type: Date })
  updatedAt?: Date;
}

export const PaypalWebhookSchema = SchemaFactory.createForClass(PaypalWebhook);
