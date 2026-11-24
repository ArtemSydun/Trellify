import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from 'src/auth/auth.module';
import { PaypalModule } from 'src/paypal/pay-pal.module';
import { RedisModule } from 'src/redis/redis.module';
import { TrelloModule } from 'src/trello/trello.module';
import { UsersModule } from 'src/user/users.module';
import { SubscriptionController } from './controllers/subscription.controller';
import {
  Subscription,
  SubscriptionSchema,
} from './entities/subscription.entity';
import { UsedTrial, UsedTrialSchema } from './entities/used-trial.entity';
import { SubscriptionRepository } from './repositories/subscription.repository';
import { UsedTrialRepository } from './repositories/used-trial.repository';
import { SubscriptionService } from './services/subscription.service';
import { UsedTrialService } from './services/used-trial.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: Subscription.name,
        schema: SubscriptionSchema,
      },
      {
        name: UsedTrial.name,
        schema: UsedTrialSchema,
      },
    ]),
    forwardRef(() => UsersModule),
    forwardRef(() => AuthModule),
    forwardRef(() => RedisModule),
    forwardRef(() => TrelloModule),
    forwardRef(() => PaypalModule),
  ],
  controllers: [SubscriptionController],
  providers: [
    SubscriptionRepository,
    UsedTrialRepository,
    SubscriptionService,
    UsedTrialService,
  ],
  exports: [
    SubscriptionRepository,
    UsedTrialRepository,
    SubscriptionService,
    UsedTrialService,
  ],
})
export class SubscriptionModule {}
