import { ApiProperty } from '@nestjs/swagger';
import { Prop } from '@nestjs/mongoose';
import { WebhookDto } from 'src/trello/dto/create-webhook.dto';

export class TrelloSettings {
    @ApiProperty({
        description: 'Trello authentication token of the user',
        example: 'TrelloToken123',
        required: false,
    })
    @Prop({ required: false })
    token: string;

    @ApiProperty({
        description: 'Trello user ID associated with the user',
        example: 'TrelloUser123',
        required: false,
    })
    @Prop({ required: false })
    userId: string;

    @ApiProperty({
        description: 'List of webhooks for the user',
        type: WebhookDto,
        required: false,
    })
    @Prop({ required: false, type: [String] })
    webhooks: string[];
}
