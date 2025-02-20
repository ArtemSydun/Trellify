import { PartialType } from '@nestjs/swagger';
import { CreateDistributionSubscriberDto } from './create-distribution-subscriber.dto';

export class UpdateDistributionDto extends PartialType(
  CreateDistributionSubscriberDto,
) {}
