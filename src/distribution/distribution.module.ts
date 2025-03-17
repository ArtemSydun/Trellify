import { forwardRef, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from 'src/auth/auth.module';
import { MailerService } from 'src/mailer/services/mailer.service';
import { UsersModule } from 'src/user/users.module';
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
    forwardRef(() => AuthModule),
    forwardRef(() => UsersModule),
  ],
  controllers: [DistributionController],
  providers: [
    DistributionService,
    DistributionSubscribersRepository,
    MailerService,
  ],
  exports: [DistributionService],
})
export class DistributionModule {}
