import { ApiProperty } from '@nestjs/swagger';
import { Prop } from '@nestjs/mongoose';
import { UserWebhookDto } from './user.webhook.dto';

export class TrelloSettings {
    @ApiProperty({
        description: 'Trello authentication token of the user',
        example: 'TrelloToken123 | null',
        required: false,
        nullable: true,
    })
    @Prop({ required: false })
    token?: string | null;

    @ApiProperty({
        description: 'Trello user ID associated with the user',
        example: 'TrelloUser123 | null',
        required: false,
        nullable: true,
        type: String
    })
    @Prop({ required: false })
    userId?: string | null;

    @ApiProperty({
        description: 'Trello username associated with the user',
        example: 'TrelloUsername | null',
        required: false,
        nullable: true,
    })
    @Prop({ required: false })
    username?: string | null;

    @ApiProperty({
        description: 'List of webhooks user connected to',
        example: [{
            webhookId: 'id1',
            idModel: 'modelId1',
            modelName: 'modelname',
        }],
        required: false,
    })
    @Prop({ required: false, type: [UserWebhookDto] })
    webhooks?: UserWebhookDto[];
}