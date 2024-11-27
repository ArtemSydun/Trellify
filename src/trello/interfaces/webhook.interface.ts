import { ApiProperty } from '@nestjs/swagger';

export interface WebhookInterface {
  id: string;
  description: string;
  idModel: string;
  callbackURL: string;
  active: boolean;
  consecutiveFailures: number;
  firstConsecutiveFailDate: string;
}

export class WebhookDto implements WebhookInterface {
  @ApiProperty({
    description: 'Unique identifier for the webhook',
    example: 'webhook123',
  })
  id: string;

  @ApiProperty({
    description: 'Description of the webhook',
    example: 'Trello board update webhook',
  })
  description: string;

  @ApiProperty({
    description: 'Trello model ID (board or list) associated with the webhook',
    example: 'board123',
  })
  idModel: string;

  @ApiProperty({
    description: 'Callback URL for webhook events',
    example: 'https://example.com/webhook/callback',
  })
  callbackURL: string;

  @ApiProperty({
    description: 'Indicates whether the webhook is active',
    example: true,
  })
  active: boolean;

  @ApiProperty({
    description: 'Number of consecutive failures for the webhook',
    example: 0,
  })
  consecutiveFailures: number;

  @ApiProperty({
    description: 'The first date the webhook failed consecutively',
    example: '2024-04-01T12:00:00Z',
  })
  firstConsecutiveFailDate: string;
}
