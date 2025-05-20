import {
  BadRequestException,
  ConflictException,
  forwardRef,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { addDays, differenceInDays, parseISO } from 'date-fns';
import { I18nContext } from 'nestjs-i18n';
import { I18nKeys } from 'src/common/enums/i18n-keys.enum';
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
  private readonly logger = new Logger(PaypalLogicService.name);
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

  async createWebhook(i18n?: I18nContext): Promise<any> {
    const accessToken = await this.paypalApiService.getAccessToken();

    const webhooks = await this.paypalWebhookRepository.findAllPaypalWebhooks();

    if (webhooks.length > 0) {
      throw new ConflictException(
        i18n?.t(I18nKeys.ERRORS_PAYPAL_WEBHOOK_ALREADY_EXIST) ||
          `Paypal webhook for Trellify already exist`,
      );
    }

    const response = await this.paypalApiService.createWebhook(accessToken);

    const newWebhook: CreatePaypalWebhookDto = {
      id: response?.id,
      callbackURL: response?.url,
    };

    const createdWebhook =
      await this.paypalWebhookRepository.create(newWebhook);

    return {
      message:
        i18n?.t(I18nKeys.MESSAGES_PAYPAL_WEBHOOK_CREATED_SUCCESSFULLY) ||
        `Paypal webhook for Trellify created successfully`,
      statusCode: HttpStatus.OK,
      data: createdWebhook,
    };
  }

  async deleteWebhook(webhookId: string, i18n?: I18nContext): Promise<any> {
    const existingWebhook = await this.findWebhookById(webhookId);

    const accessToken = await this.paypalApiService.getAccessToken();

    await this.paypalApiService.deleteWebhook(accessToken, existingWebhook.id);

    await this.paypalWebhookRepository.deleteById(existingWebhook.id);

    return {
      message:
        i18n?.t(I18nKeys.MESSAGES_PAYPAL_WEBHOOK_DELETED_SUCCESSFULLY, {
          args: {
            webhookId,
          },
        }) || `Webhook ${webhookId} deleted successfully`,
      statusCode: HttpStatus.OK,
    };
  }

  async findWebhooks(): Promise<any> {
    return await this.paypalWebhookRepository.findAllPaypalWebhooks();
  }

  async findWebhookById(
    webhookId: string,
    i18n?: I18nContext,
  ): Promise<PaypalWebhook> {
    const webhook = await this.paypalWebhookRepository.findOneById(webhookId);

    if (!webhook) {
      throw new NotFoundException(
        i18n?.t(I18nKeys.ERRORS_PAYPAL_WEBHOOK_DOES_NOT_EXIST, {
          args: { webhookId },
        }) || `Paypal webhook ${webhookId} does not exist`,
      );
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
      parseFloat(event.resource?.shipping_amount?.value) ||
      parseFloat(event.resource?.amount?.total);
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
    const eventDate = event.resource?.create_time;
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
        // for test purposes, we got this event twice for some reason
        console.log(event);
        await this.usersService.handlePaymentSaleCompleted(
          subscriptionId,
          paymentId,
          paymentAmount,
          eventDate,
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

  async activateSubscription(
    paypalSubscriptionId: string,
    i18n?: I18nContext,
  ): Promise<any> {
    const accessToken = await this.paypalApiService.getAccessToken();

    const subscriptionInfo = await this.paypalApiService.getSubscription(
      accessToken,
      paypalSubscriptionId,
    );

    if (subscriptionInfo?.status === 'ACTIVE') {
      this.logger.log(
        i18n?.t(I18nKeys.ERRORS_SUBSCRIPTION_ALREADY_ACTIVATED, {
          args: {
            subscription: paypalSubscriptionId,
          },
        }) || 'This subscription has been already activated',
      );

      return;
    }

    const response = await this.paypalApiService.activateSubscription(
      accessToken,
      paypalSubscriptionId,
    );

    return response;
  }

  async pauseSubscription(
    paypalSubscriptionId: string,
    reason: string,
    i18n?: I18nContext,
  ): Promise<any> {
    const accessToken = await this.paypalApiService.getAccessToken();

    const subscriptionInfo = await this.paypalApiService.getSubscription(
      accessToken,
      paypalSubscriptionId,
    );

    if (subscriptionInfo?.status === 'SUSPENDED') {
      this.logger.log(
        i18n?.t(I18nKeys.ERRORS_SUBSCRIPTION_ALREADY_PAUSED, {
          args: {
            subscription: paypalSubscriptionId,
          },
        }) || 'This subscription has been already paused',
      );

      return;
    }

    const response = await this.paypalApiService.pauseSubscription(
      accessToken,
      paypalSubscriptionId,
      reason,
    );

    return response;
  }

  async cancelSubscription(
    paypalSubscriptionId: string,
    reason: string,
    i18n?: I18nContext,
  ): Promise<any> {
    const accessToken = await this.paypalApiService.getAccessToken();

    const subscriptionInfo = await this.paypalApiService.getSubscription(
      accessToken,
      paypalSubscriptionId,
    );

    if (subscriptionInfo?.status === 'CANCELLED') {
      this.logger.log(
        i18n?.t(I18nKeys.ERRORS_SUBSCRIPTION_ALREADY_CANCELLED, {
          args: {
            subscription: paypalSubscriptionId,
          },
        }) || 'This subscription has been already cancelled',
      );

      return;
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
      i18n,
    );

    if (subscriber?.subscription?.paypalSubscriptionId !== null) {
      await this.cancelSubscription(
        subscriber?.subscription?.paypalSubscriptionId,
        `Subcription upgraded from ${subscriber?.subscription?.plan} to ${correspondingSubscription?.name}`,
      );
    }

    return {
      message:
        i18n?.t(I18nKeys.MESSAGES_SUBSCRIPTION_USER_CHANGED_SUCCESSFULLY, {
          args: {
            email: updatedUser.email,
            subscription: correspondingSubscription.name,
          },
        }) ||
        `User ${updatedUser.email} successfully changed plan to ${correspondingSubscription.name}`,
      statusCode: HttpStatus.OK,
      data: updatedUser,
    };
  }

  async checkSubscriptionPayment(
    userId: string,
    i18n?: I18nContext,
  ): Promise<DefaultResponse<User>> {
    const requestedUser = await this.usersService.getUser(userId, i18n);

    const sub = requestedUser?.subscription;

    const lastPayment = await this.getLastSubscriptionPayment(
      sub.paypalSubscriptionId,
    );

    if (!lastPayment?.time) {
      throw new BadRequestException(
        i18n?.t(I18nKeys.ERRORS_PAYPAL_PAYMENT_NOT_FOUND) ||
          `No transactions found for your subscription`,
      );
    }

    const lastPaymentDate = parseISO(lastPayment.time);
    const now = new Date();

    const daysSincePayment = differenceInDays(now, lastPaymentDate);

    if (sub.expired && daysSincePayment <= 30) {
      const lastAmount = parseFloat(
        lastPayment?.amount_with_breakdown?.gross_amount?.value || '0',
      );

      const updatedSubscription = {
        ...sub,
        expired: false,
        nextPaymentDate: addDays(parseISO(lastPayment.time), 30),
        lastPaymentId: lastPayment.id,
        lastAmount,
        totalAmount: (sub.totalAmount || 0) + lastAmount,
      };

      const updatedUser = await this.usersService.updateUser(requestedUser, {
        subscription: updatedSubscription,
      });

      return {
        message:
          i18n?.t(I18nKeys.MESSAGES_PAYPAL_PAYMENT_VERIFIED) ||
          'Your last transaction verified. Your subscription renewed',
        statusCode: HttpStatus.OK,
        data: updatedUser.data,
      };
    }

    return {
      message:
        'Subscription is already active. If it is not, please, contact Trellify support then',
      statusCode: HttpStatus.OK,
      data: requestedUser,
    };
  }

  async getLastSubscriptionPayment(subscriptionId: string): Promise<any> {
    const accessToken = await this.paypalApiService.getAccessToken();
    // 30 SECONDS TO VERIFY PAYMENT.
    // NECCESSARY BECAUSE PAYPAL SENDS WEBHOOK EVENT THAT SALE COMPLETED BEFORE
    // TRANSACTION STORED IN PAYPAL DATABASE, SO WE NEED TO WAIT.
    for (let attempt = 0; attempt < 10; attempt++) {
      const response = await this.paypalApiService.getSubscriptionTransactions(
        accessToken,
        subscriptionId,
      );

      if (response?.transactions?.length > 0) {
        return response.transactions[0];
      }

      console.warn(
        console.log(response?.transactions),
        `[PayPal] Attempt ${attempt + 1}: No transaction found, retrying...`,
      );
      await new Promise((res) => setTimeout(res, 3000)); // Wait 3 seconds before retry
    }

    console.error('[PayPal] No transactions found after retries');
    return {};
  }
}
