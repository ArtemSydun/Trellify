import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from 'src/auth/auth.module';
import { UsersModule } from 'src/user/users.module';
import { SubscriptionController } from './controllers/subscription.controller';
import {
  Subscription,
  SubscriptionSchema,
} from './entities/subscription.entity';
import { SubscriptionRepository } from './repositories/subscription.repository';
import { SubscriptionService } from './services/subscription.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: Subscription.name,
        schema: SubscriptionSchema,
      },
    ]),
    forwardRef(() => UsersModule),
    forwardRef(() => AuthModule),
  ],
  controllers: [SubscriptionController],
  providers: [SubscriptionRepository, SubscriptionService],
  exports: [SubscriptionRepository, SubscriptionService],
})
export class SubscriptionModule {}
