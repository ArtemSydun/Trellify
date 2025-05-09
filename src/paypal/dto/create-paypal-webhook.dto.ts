import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class CreatePaypalWebhookDto {
  @ApiProperty({
    description: 'Id of trellify plan',
    example: '673ef22130ed24174d378374',
  })
  @IsString()
  trellifyPlanId: string;

  @ApiProperty({
    description: 'Paypal webhook id',
  })
  @IsString()
  paypalWebhookId: string;

  @ApiProperty({
    description: 'Paypal plan id',
  })
  @IsString()
  paypalPlanId: string;

  @ApiProperty({
    description: 'Webhook callbackURL',
  })
  @IsString()
  callbackURL: string;
}
