import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  Min,
  ValidateNested,
} from 'class-validator';
import { NotificationBooleansDto } from 'src/trello/dto/notifications.dto';
import { SubscriptionPlans } from '../enum/subscription-plan.enum';

export class CreateSubscriptionDto {
  @ApiProperty({
    description: 'Name of the subscription plan',
    enum: SubscriptionPlans,
    example: SubscriptionPlans.FULL,
  })
  @IsEnum(SubscriptionPlans)
  @IsNotEmpty()
  name: SubscriptionPlans;

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
}
