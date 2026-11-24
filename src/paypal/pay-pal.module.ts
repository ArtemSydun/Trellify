import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from 'src/auth/auth.module';
import { SharedConfigService } from 'src/config/services/shared.config.service';
import { SubscriptionModule } from 'src/subscription/subscription.module';
import { UsersModule } from 'src/user/users.module';

import { PaypalController } from './controllers/paypal.controller';
import {
  PaypalWebhook,
  PaypalWebhookSchema,
} from './entities/paypal-webhook.entity';
import { PaypalWebhookRepository } from './repositories/paypal-webhook.repository';
import { PaypalApiService } from './services/paypal-api.service';
import { PaypalLogicService } from './services/paypal-logic.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: PaypalWebhook.name,
        schema: PaypalWebhookSchema,
      },
    ]),
    forwardRef(() => UsersModule),
    forwardRef(() => AuthModule),
    forwardRef(() => SubscriptionModule),
  ],
  controllers: [PaypalController],
  providers: [
    PaypalLogicService,
    PaypalApiService,
    PaypalWebhookRepository,
    SharedConfigService,
  ],
  exports: [PaypalLogicService, PaypalApiService],
})
export class PaypalModule {}
