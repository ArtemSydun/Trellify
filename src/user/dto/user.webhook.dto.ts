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

  //fix
  // @ApiProperty({
  //   description: 'Id of discord channel where notifications should be sent',
  //   type: String,
  //   example: 'id1',
  //   nullable: true,
  // })
  // discordChannelId: string | null;

  // @ApiProperty({
  //   description: 'Id of telegram channel where notifications should be sent',
  //   type: Number,
  //   example: -1,
  //   nullable: true,
  // })
  // telegramChannelId: number | null;
}
