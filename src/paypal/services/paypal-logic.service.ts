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

  async createWebhook(): Promise<any> {
    const accessToken = await this.paypalApiService.getAccessToken();

    const webhooks = await this.paypalWebhookRepository.findAllPaypalWebhooks();

    if (webhooks.length > 0) {
      throw new ConflictException(`Paypal webhook for Trellify already exist`);
    }

    const response = await this.paypalApiService.createWebhook(accessToken);

    const newWebhook: CreatePaypalWebhookDto = {
      id: response?.id,
      callbackURL: response?.url,
    };

    const createdWebhook =
      await this.paypalWebhookRepository.create(newWebhook);

    return {
      message: `Paypal webhook for Trellify created successfully`,
      statusCode: HttpStatus.OK,
      data: createdWebhook,
    };
  }

  async deleteWebhook(webhookId: string): Promise<any> {
    const existingWebhook = await this.findWebhookById(webhookId);

    const accessToken = await this.paypalApiService.getAccessToken();

    await this.paypalApiService.deleteWebhook(accessToken, existingWebhook.id);

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

  async handleWebhookEvent(event: any): Promise<void> {
    const eventType = event.event_type;
    const subscriptionId =
      event.resource?.billing_agreement_id || event.resource?.id;
    const planId = event.resource?.plan_id;
    const payerEmail = event.resource?.subscriber?.email_address;
    const paymentCurrency =
      event.resource?.shipping_amount?.currency_code ||
      event.resource?.amount?.currency;
    const paymentAmount =
      event.resource?.shipping_amount?.value || event.resource?.amount?.total;
    const userId = event.resource?.custom_id || event.resource?.custom;
    const paymentId = event.resource?.id;
    const logData = {
      'Event type': eventType,
      'Paypal Plan Id': planId,
      'Trellify userId': userId,
      'Subscription id': subscriptionId,
      'Email of payer': payerEmail,
      'Transaction currency': paymentCurrency,
      'Transaction amount': paymentAmount,
      'Transaction id': paymentId,
    };
    console.log(JSON.stringify(logData, null, 2));

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
        await this.usersService.refreshSubscriptionPayment(
          subscriptionId,
          paymentId,
        );
        console.log(`Payment completed for subscription: ${subscriptionId}`);
        break;
      case 'PAYMENT.SALE.REFUNDED':
        await this.usersService.handleRefundedSubscriptionPayment(paymentId);
        console.log(`Payment refunded: ${paymentId}`);
        break;
      default:
        console.log(`Unhandled event: ${eventType}`);
    }
  }

  async cancelSubscription(
    paypalSubscriptionId: string,
    reason: string,
  ): Promise<any> {
    const accessToken = await this.paypalApiService.getAccessToken();

    const subscriptionInfo = await this.paypalApiService.getSubscription(
      accessToken,
      paypalSubscriptionId,
    );

    if (subscriptionInfo?.status === 'CANCELLED') {
      throw new BadRequestException(
        'This subscription has been already cancelled',
      );
    }

    const response = await this.paypalApiService.cancelSubscription(
      accessToken,
      paypalSubscriptionId,
      reason,
    );

    return response;
  }

  async confirmSubscriptionActivation(
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

    const subscriber = await this.usersService.getUser(userId, i18n);

    const updatedUser = await this.usersService.changeSubscriptionPlan(
      subscriber,
      correspondingSubscription.id,
      paypalSubscriptionId,
      amount,
      i18n,
    );

    if (subscriber?.subscription?.paypalSubscriptionId !== null) {
      await this.cancelSubscription(
        subscriber?.subscription?.paypalSubscriptionId,
        `Subcription upgraded from ${subscriber?.subscription?.plan} to ${correspondingSubscription?.name}`,
      );
    }

    return {
      message: `Subscription plan ${correspondingSubscription.name} activated successfully`,
      statusCode: HttpStatus.OK,
      data: updatedUser.data,
    };
  }

  async getLastSubscriptionPayment(subscriptionId: string): Promise<any> {
    const accessToken = await this.paypalApiService.getAccessToken();

    // NECCESSARY BECAUSE PAYPAL SENDS WEBHOOK EVENT THAT SALE COMPLETED BEFORE
    // TRANSACTION STORED IN PAYPAL DATABASE, SO WE NEED TO WAIT.
    for (let attempt = 0; attempt < 3; attempt++) {
      const response = await this.paypalApiService.getSubscriptionTransactions(
        accessToken,
        subscriptionId,
      );

      if (response?.transactions?.length > 0) {
        return response.transactions[0];
      }

      console.warn(
        `[PayPal] Attempt ${attempt + 1}: No transaction found, retrying...`,
      );
      await new Promise((res) => setTimeout(res, 3000)); // Wait 3 seconds before retry
    }

    console.error('[PayPal] No transactions found after retries');
    return {};
  }
}
