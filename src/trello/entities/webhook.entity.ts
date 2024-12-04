import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';

@Schema({ timestamps: true, collection: 'trello_webhooks' })
export class Webhook {
    @ApiProperty({
        description: 'Unique identifier for the webhook',
        example: '6748311e20b49e848f710448',
    })
    @Prop({ required: true })
    id: string;

    @ApiProperty({
        description: 'Description of the webhook, if provided. This can be empty.',
        example: '',
    })
    @Prop({ required: false })
    description: string;

    @ApiProperty({
        description: 'Unique identifier for the Trello model associated with the webhook, e.g., a board or a list.',
        example: '673ef22130ed24174d378374',
    })
    @Prop({ required: true })
    idModel: string;

    @ApiProperty({
        description: 'Callback URL that Trello will send events to when they occur on the associated model.',
        example: 'https://2f51-185-208-231-18.ngrok-free.app/trello/webhook/e3ea1236-1ee7-4bba-bc5e-20334a4ed7b4',
    })
    @Prop({ required: true })
    callbackURL: string;

    @ApiProperty({
        description: 'Indicates whether the webhook is active or not.',
        example: true,
    })
    @Prop({ required: true })
    active: boolean;

    @ApiProperty({
        description: 'The number of consecutive failures when trying to call the callback URL.',
        example: 0,
    })
    @Prop({ required: true })
    consecutiveFailures: number;

    @ApiProperty({
        description: 'Timestamp of the first consecutive failure, if any.',
        example: null,
    })
    @Prop({ required: false })
    firstConsecutiveFailDate: Date | null;

    @ApiProperty({
        description: 'The name of the Trello board associated with the webhook.',
        example: 'Marketing Campaign Board',
    })
    @Prop({ required: true })
    boardName: string;

    @ApiProperty({
        description: 'Webhook creator token',
        example: 'webhook creator crypted token'
    })
    @Prop({ required: true })
    authorToken: string;

    @ApiProperty({
        description: 'List of Trello user IDs who are subscribed to this webhook.',
        type: [String],
        example: ['userId1', 'userId2', 'userId3'],
    })
    @Prop({ type: [String], required: true })
    subscribers: string[];
}

export const WebhookSchema = SchemaFactory.createForClass(Webhook);
