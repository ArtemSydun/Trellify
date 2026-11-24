import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class CreatePaypalWebhookDto {
  @ApiProperty({
    description: 'Paypal webhook id',
  })
  @IsString()
  id: string;

  @ApiProperty({
    description: 'Webhook callbackURL',
  })
  @IsString()
  callbackURL: string;
}
