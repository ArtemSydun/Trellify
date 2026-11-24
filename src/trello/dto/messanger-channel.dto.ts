import { ApiProperty } from '@nestjs/swagger';

export class MessangerChannel {
  @ApiProperty({
    description: 'Webhook notification author id',
    example: 'trellify user id',
  })
  authorId: string;

  @ApiProperty({
    description: 'Webhook group channel id',
    example: '123',
  })
  channelId: string | number | null;
}
