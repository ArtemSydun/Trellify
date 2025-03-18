import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, Min } from 'class-validator';

export class UpdateSubscriptionDto {
  @ApiProperty({ description: 'Price of the subscription in USD', example: 3 })
  @IsNumber()
  @Min(0)
  price: number;
}
