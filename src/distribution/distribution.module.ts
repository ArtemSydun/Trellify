import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { MailerService } from 'src/mailer/services/mailer.service';
import { DistributionController } from './controllers/distribution.controller';
import {
  DistributionSubscriber,
  DistributionSubscriberSchema,
} from './entities/distribution-subscriber.entity';
import { DistributionSubscribersRepository } from './repositories/distribution-subscribers.repository';
import { DistributionService } from './services/distribution.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: DistributionSubscriber.name,
        schema: DistributionSubscriberSchema,
      },
    ]),
    ConfigModule,
  ],
  controllers: [DistributionController],
  providers: [
    DistributionService,
    DistributionSubscribersRepository,
    MailerService,
  ],
  exports: [],
})
export class DistributionModule {}
