import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { randomUUID } from 'crypto';
import { HydratedDocument } from 'mongoose';
import { WebhookInterface } from 'src/trello/interfaces/webhook.interface';

export type UserDocument = HydratedDocument<User>;

@Schema({ timestamps: true })
export class User {
  @Prop({ default: randomUUID()})
  id: string;

  @Prop({ required: true })
  email: string;

  @Prop({ required: true })
  password: string;

  @Prop({ required: false })
  trelloToken: string;

  @Prop({ required: false })
  trelloUserId: string;
  
  @Prop({ required: false })
  webhooks: WebhookInterface[];

  @Prop({ required: false })
  telegramUsername: string;

  @Prop({ required: false })
  telegramChatId: string;
}

export const UserSchema = SchemaFactory.createForClass(User);
