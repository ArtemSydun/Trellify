import {
  BadRequestException,
  ConflictException,
  forwardRef,
  HttpStatus,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { I18nContext } from 'nestjs-i18n';
import { DefaultResponse } from 'src/common/interfaces/responses';
import { SharedConfigService } from 'src/config/services/shared.config.service';
import { User } from 'src/user/entities/user.entity';
import { UsersService } from 'src/user/services/users.service';
import { SubscriptionService } from '../../subscription/services/subscription.service';
import { CreatePaypalWebhookDto } from '../dto/create-paypal-webhook.dto';
import { PaypalWebhook } from '../entities/paypal-webhook.entity';
import { PaypalWebhookRepository } from '../repositories/paypal-webhook.repository';
import { PaypalApiService } from './paypal-api.service';

@Injectable()
export class PaypalLogicService {
  constructor(
    private readonly configService: ConfigService,
    private readonly sharedConfigService: SharedConfigService,
    private readonly paypalWebhookRepository: PaypalWebhookRepository,
    private readonly paypalApiService: PaypalApiService,
    @Inject(forwardRef(() => SubscriptionService))
    private readonly subscriptionService: SubscriptionService,
    @Inject(forwardRef(() => UsersService))
    private readonly usersService: UsersService,
  ) {}

  async createWebhook(trellifyPlanId: string): Promise<any> {
    const trellifyPlan =
      await this.subscriptionService.findSubscriptionById(trellifyPlanId);

    const existingWebhook =
      await this.paypalWebhookRepository.findOneByTrellifyPlanId(
        trellifyPlanId,
      );

    if (existingWebhook) {
      throw new ConflictException(
        `Webhook for plan ${trellifyPlan.name} already exist`,
      );
    }

    const accessToken = await this.paypalApiService.getAccessToken();

    const webhooks = await this.paypalApiService.findWebhooks(accessToken);

    if (
      webhooks.find(
        (webhook) =>
          webhook.url === this.sharedConfigService.getPaypalWebhookUrl(),
      )
    ) {
      throw new ConflictException(
        `Paypal webhook for ${trellifyPlan.name} plan already created`,
      );
    }

    const response = await this.paypalApiService.createWebhook(
      accessToken,
      trellifyPlan.paypalPlanId,
    );

    const newWebhook: CreatePaypalWebhookDto = {
      paypalWebhookId: response?.id,
      paypalPlanId: trellifyPlan?.paypalPlanId,
      trellifyPlanId: trellifyPlan?.id,
      callbackURL: response?.url,
    };

    const createdWebhook =
      await this.paypalWebhookRepository.create(newWebhook);

    return {
      message: `Webhook for plan ${trellifyPlanId} created successfully`,
      statusCode: HttpStatus.OK,
      data: createdWebhook,
    };
  }

  async deleteWebhook(webhookId: string): Promise<any> {
    const existingWebhook = await this.findWebhookById(webhookId);

    const accessToken = await this.paypalApiService.getAccessToken();

    await this.paypalApiService.deleteWebhook(
      accessToken,
      existingWebhook.paypalWebhookId,
    );

    await this.paypalWebhookRepository.deleteById(existingWebhook.id);

    return {
      message: `Webhook ${webhookId} deleted successfully`,
      statusCode: HttpStatus.OK,
    };
  }

  async findWebhooks(): Promise<any> {
    return await this.paypalWebhookRepository.findAllPaypalWebhooks();
  }

  async findWebhookById(webhookId: string): Promise<PaypalWebhook> {
    const webhook = await this.paypalWebhookRepository.findOneById(webhookId);

    if (!webhook) {
      throw new NotFoundException(`Paypal webhook ${webhookId} does not exist`);
    }

    return webhook;
  }

  async handleWebhookEvent(
    event: any,
    subscriptionPlanId: string,
  ): Promise<void> {
    console.log(event);
    const details = event.resource?.amount?.details;
    console.log('Transaction Details:', details);
    // Process only if the planId matches the subscriptionPlanId from the route
    if (event.resource?.plan_id !== subscriptionPlanId) {
      console.log(
        `Ignored event for plan ${event.resource?.plan_id} on endpoint for plan ${subscriptionPlanId}`,
      );
      return;
    }

    const eventType = event.event_type;
    const subscriptionId = event.resource?.id;
    const planId = event.resource?.plan_id;
    const payerEmail = event.resource?.subscriber?.email_address;
    const paymentCurrency =
      event.resource?.shipping_amount?.currency_code ||
      event.resource?.amount?.currency;
    const paymentAmount =
      event.resource?.shipping_amount?.value || event.resource?.amount?.total;

    const logData = {
      'Paypal Plan Id': planId,
      'Event type': eventType,
      'Subscription id': subscriptionId,
      'Email of payer': payerEmail,
      'Transaction currency': paymentCurrency,
      'Transaction amount': paymentAmount,
    };
    console.log(JSON.stringify(logData, null, 2));
    console.log(JSON.stringify(event?.resource?.amount?.details, null, 2));

    switch (eventType) {
      case 'BILLING.SUBSCRIPTION.ACTIVATED':
        console.log(`Activated subscription: ${subscriptionId}`);
        break;
      case 'BILLING.SUBSCRIPTION.CANCELLED':
        console.log(`Cancelled subscription: ${subscriptionId}`);
        break;
      case 'BILLING.SUBSCRIPTION.PAYMENT.FAILED':
        console.log(`Payment failed for subscription: ${subscriptionId}`);
        break;
      case 'PAYMENT.SALE.COMPLETED':
        console.log(`Payment completed for subscription: ${subscriptionId}`);
        break;
      default:
        console.log(`Unhandled event: ${eventType}`);
    }
  }

  async cancelSubscription(
    subscriptionId: string,
    reason: string,
  ): Promise<any> {
    const accessToken = await this.paypalApiService.getAccessToken();

    const subscriptionInfo = await this.paypalApiService.getSubscription(
      accessToken,
      subscriptionId,
    );

    if (subscriptionInfo?.status === 'CANCELLED') {
      throw new BadRequestException(
        'This subscription has been already cancelled',
      );
    }

    const response = await this.paypalApiService.cancelSubscription(
      accessToken,
      subscriptionId,
      reason,
    );

    return response;
  }

  async confirmSubscriptionPayment(
    paypalPlanId: string,
    paypalSubscriptionId: string,
    amount: string,
    userId: string,
    i18n?: I18nContext,
  ): Promise<DefaultResponse<User>> {
    //check if target plan does exist
    const correspondingSubscription =
      await this.subscriptionService.findSubscriptionByPayPalPlanId(
        paypalPlanId,
        i18n,
      );

    const paymentDate = new Date();

    const updatedUser = await this.usersService.changeSubscriptionPlan(
      userId,
      correspondingSubscription.id,
      paypalSubscriptionId,
      amount,
      paymentDate,
      i18n,
    );

    return {
      message: `Subscription plan ${correspondingSubscription.name} activated successfully`,
      statusCode: HttpStatus.OK,
      data: updatedUser.data,
    };
  }
}
