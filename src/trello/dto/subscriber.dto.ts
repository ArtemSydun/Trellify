import { ApiProperty } from '@nestjs/swagger';
import { TrelloWebhookNotificationProfiles } from '../enums/trello.actions.enum';

export class WebhookSubscriber {
  @ApiProperty({
    description: 'Trellify userId of subscriber',
    example: '673ef22130ed24174d378374',
  })
  userId: string;

  @ApiProperty({
    description: 'Email of subscriber',
    type: String,
    example: 'subscriber@email.com',
  })
  email: string;

  @ApiProperty({
    description: 'Trello user ID of the subscriber.',
    type: String,
    example: 'userId1',
  })
  trelloUserId: string;

  @ApiProperty({
    description: 'Trello token of the subscriber.',
    type: String,
    example: 'trelloToken',
  })
  trelloToken: string;

  @ApiProperty({
    description: 'Notification profile of the subscriber.',
    enum: TrelloWebhookNotificationProfiles,
    example: TrelloWebhookNotificationProfiles.BASIC,
  })
  notificationProfile: TrelloWebhookNotificationProfiles;
}
