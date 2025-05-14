import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { NotificationBooleansDto } from 'src/trello/dto/notifications.dto';

export class UpdateSubscriptionDto {
  @ApiProperty({ description: 'Price of the subscription in USD', example: 3 })
  @IsNumber()
  @Min(0)
  price: number;

  @ApiProperty({
    description: 'Notifications choosen by user',
    type: NotificationBooleansDto,
  })
  @ValidateNested()
  @Type(() => NotificationBooleansDto)
  notifications: NotificationBooleansDto;

  @ApiProperty({
    description: 'PayPal subscription plan id',
  })
  @IsOptional()
  @IsString()
  paypalPlanId?: string;
}
