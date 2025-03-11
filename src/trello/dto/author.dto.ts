import { ApiProperty } from '@nestjs/swagger';

export class WebhookAuthor {
  @ApiProperty({
    description: 'Webhook creator user id',
    example: 'trellify user id',
  })
  userId: string;

  @ApiProperty({
    description: 'Webhook creator email',
    example: 'creator@email.com',
  })
  email: string;

  @ApiProperty({
    description: 'Webhook creator Trello user id',
    example: '673ef22130ed24174d378374',
  })
  trelloUserId: string;

  @ApiProperty({
    description: 'Webhook creator token',
    example: 'trelloUserToken',
  })
  trelloToken: string;
}
