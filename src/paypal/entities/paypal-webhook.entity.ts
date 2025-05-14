import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';

@Schema({ timestamps: true, collection: 'paypal_webhooks' })
export class PaypalWebhook {
  @ApiProperty({ description: 'Paypal webhook ID' })
  @Prop({ required: true })
  id: string;

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
