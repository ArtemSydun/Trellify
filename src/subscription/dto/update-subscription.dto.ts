import { PartialType } from '@nestjs/swagger';
import { Subscription } from '../entities/subscription.entity';

export class UpdateSubscriptionDto extends PartialType(Subscription) {}
