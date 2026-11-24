import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { Schema as MongooseSchema } from 'mongoose';
import { WebhookAuthor } from '../dto/author.dto';
import { NotificationCategoriesDto } from '../dto/notifications.dto';
import { WebhookSubscriber } from '../dto/subscriber.dto';

@Schema({ timestamps: true, collection: 'trello_webhooks' })
export class Webhook {
  @ApiProperty({
    description: 'Unique identifier for the webhook',
    example: '6748311e20b49e848f710448',
  })
  @Prop({ required: true })
  id: string;

  @ApiProperty({
    description:
      'Unique identifier for the Trello model associated with the webhook, e.g., a board or a list.',
    example: '1111122130ed24174d378374',
  })
  @Prop({ required: true })
  idModel: string;

  @ApiProperty({
    description:
      'Unique identifier for the Trello workspace id associated with this model.',
    example: '3245122130ed24174d378374',
  })
  @Prop({ required: true })
  idWorkspace: string;

  @ApiProperty({
    description:
      'Callback URL that Trello will send events to when they occur on the associated model.',
    example:
      'https://api-link/trello/webhook/e3ea1236-1ee7-4bba-bc5e-20334a4ed7b4',
  })
  @Prop({ required: true })
  callbackURL: string;

  @ApiProperty({
    description: 'The name of the Trello board associated with the webhook.',
    example: 'Marketing Campaign Board',
  })
  @Prop({ required: true })
  boardName: string;

  @ApiProperty({
    description: 'Connected board URL',
    example: 'https://trello.com/boardURL',
  })
  @Prop({ required: true })
  boardUrl: string;

  @ApiProperty({
    description: 'Webhook creator info',
    example: WebhookAuthor,
  })
  @Prop({ required: true })
  author: WebhookAuthor;

  @ApiProperty({
    description: 'Number of total webhook subscribers',
    type: Number,
    example: 2,
  })
  @Prop({ type: Number, required: true })
  totalSubscribers: number;

  @ApiProperty({
    description: 'List of Trello user IDs who are subscribed to this webhook.',
    type: [WebhookSubscriber],
    example: ['userId1'],
  })
  @Prop({ type: [WebhookSubscriber], required: true })
  subscribers: WebhookSubscriber[];

  @ApiProperty({
    description:
      'Notifications for various events with user IDs for each event.',
    type: Object,
  })
  @Prop({ type: MongooseSchema.Types.Mixed, required: false })
  notifications: NotificationCategoriesDto;

  @Prop()
  createdAt?: Date;

  @Prop()
  updatedAt?: Date;
}

export const WebhookSchema = SchemaFactory.createForClass(Webhook);
