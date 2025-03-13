import { ApiProperty } from '@nestjs/swagger';

export class UserWebhookDto {
  @ApiProperty({
    description: 'The ID of the webhook',
    example: 'Webhook123',
  })
  webhookId: string;

  @ApiProperty({
    description: 'The ID of the Trello model associated with the webhook',
    example: 'Model123',
  })
  idModel: string;

  @ApiProperty({
    description: 'The name of the Trello model associated with the webhook',
    example: 'Board or Card',
  })
  modelName: string;
}
