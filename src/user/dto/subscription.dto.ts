import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { SubscriptionPlans } from 'src/subscription/enum/subscription-plan.enum';

export class SubscriptionSettings {
  @ApiProperty({
    description: 'Id of subscription plan',
    example: 'id1',
    nullable: false,
  })
  @IsUUID()
  id: string;

  @ApiProperty({
    description: 'Subscription plan name',
    example: SubscriptionPlans.TRIAL,
    nullable: false,
    enum: SubscriptionPlans,
  })
  @IsEnum(SubscriptionPlans, {
    message: 'Plan must be a valid value',
  })
  plan: SubscriptionPlans;

  @ApiProperty({
    description: 'Amount of last payment (in USD)',
    example: 5,
    nullable: false,
  })
  lastAmount: number;

  @ApiProperty({
    description: 'Total amount of payments (in USD)',
    example: 25,
    nullable: false,
  })
  totalAmount: number;

  @ApiProperty({
    description:
      'Date of last subscription plan payment (null if user is on trial or lifetime from betatest)',
    example: new Date(),
    required: true,
    nullable: true,
  })
  lastPaymentDate: Date;

  @ApiProperty({
    description:
      'Date of next subscription plan payment (null if lifetime plan)',
    example: new Date(),
    required: true,
    nullable: true,
  })
  nextPaymentDate?: Date;

  @ApiProperty({
    description: 'Boolean value of if subscription is expired or not',
    example: false,
    required: true,
  })
  expired?: boolean;

  @ApiProperty({
    description: 'PayPal subscription ID (null if not paid via PayPal)',
    example: 'I-9WX9XYY3GAXX',
    required: false,
    nullable: true,
  })
  @IsOptional()
  @IsString()
  paypalSubscriptionId?: string | null;
}
