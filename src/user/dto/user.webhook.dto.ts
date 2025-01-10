import { Prop } from "@nestjs/mongoose";
import { ApiProperty } from "@nestjs/swagger";
import { TrelloWebhookNotificationProfiles } from "src/trello/enums/trello.actions.enum";

export class UserWebhookDto {
    @ApiProperty({
        description: 'The ID of the webhook',
        example: 'Webhook123',
    })
    @Prop({ required: true })
    webhookId: string;

    @ApiProperty({
        description: 'The ID of the Trello model associated with the webhook',
        example: 'Model123',
    })
    @Prop({ required: true })
    idModel: string;

    @ApiProperty({
        description: 'The name of the Trello model associated with the webhook',
        example: 'Board or Card',
    })
    @Prop({ required: true })
    modelName: string;

    // @ApiProperty({
    //     description: 'The name of the Trello model associated with the webhook',
    //     example: 'Board or Card',
    // })
    // @Prop({ required: true })
    // notificationProfile: TrelloWebhookNotificationProfiles;
}