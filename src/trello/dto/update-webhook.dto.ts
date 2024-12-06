import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsOptional, IsObject } from 'class-validator';
import { Notifications } from './notifications.dto';

export class UpdateWebhookDto {
    @ApiProperty({
        description: 'List of Trello user IDs who are subscribed to this webhook.',
        type: [String],
        example: ['userId1', 'userId2', 'userId3'],
        required: false,
    })
    @IsArray()
    @IsOptional()
    subscribers?: string[];

    @ApiProperty({
        description: 'Notifications for various events with user IDs for each event.',
        type: [Notifications],
        required: false,
    })
    @IsObject()
    @IsOptional()
    notifications?: Record<string, boolean>;

    // @ApiProperty({
    //     description: 'The name of the Trello board associated with the webhook.',
    //     example: 'Marketing Campaign Board',
    //     required: false,
    // })
    // @IsString()
    // @IsOptional()
    // boardName?: string;

    // @ApiProperty({
    //     description: 'Webhook creator token (if you wish to update it).',
    //     example: 'webhook creator crypted token',
    //     required: false, 
    // })
    // @IsString()
    // @IsOptional()
    // authorToken?: string;
}
