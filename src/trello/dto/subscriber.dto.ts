import { ApiProperty } from '@nestjs/swagger';
import { TrelloWebhookNotificationProfiles } from '../enums/trello.actions.enum';

export class WebhookSubscriber {
  @ApiProperty({
    description: 'Trello user ID of the subscriber.',
    type: String,
    example: 'userId1',
  })
  trelloUserId: string;

  @ApiProperty({
    description: 'Notification profile of the subscriber.',
    enum: TrelloWebhookNotificationProfiles,
    example: TrelloWebhookNotificationProfiles.BASIC,
  })
  notificationProfile: TrelloWebhookNotificationProfiles;
}
