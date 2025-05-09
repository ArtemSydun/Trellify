import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { configServiceKeys } from 'src/common/enums/config-service-keys.enum';
import { SharedConfigService } from 'src/config/services/shared.config.service';

@Injectable()
export class PaypalApiService {
  constructor(
    private readonly configService: ConfigService,
    private readonly sharedConfigService: SharedConfigService,
  ) {}

  private clientId = this.sharedConfigService.getPaypalClientId();
  private clientSecret = this.sharedConfigService.getPaypalClientSecret();
  private baseURL = this.sharedConfigService.getPaypalApiUrl(); // change to live later

  public async getAccessToken(): Promise<string> {
    const auth = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString(
      'base64',
    );

    const response = await axios.post(
      `${this.baseURL}/v1/oauth2/token`,
      'grant_type=client_credentials',
      {
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      },
    );

    console.log('access token: ', response.data.access_token);
    return response.data.access_token;
  }

  async findWebhooks(accessToken: string): Promise<any> {
    try {
      const response = await axios.get(
        `${this.baseURL}/v1/notifications/webhooks`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        },
      );

      return response.data?.webhooks;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error(
          '[PayPal] Find Webhook Axios error:',
          error.response?.data || error.message,
        );
      } else {
        console.error('[PayPal] Unexpected error:', error);
      }
      throw new Error('Failed to find PayPal webhooks');
    }
  }

  async createWebhook(
    accessToken: string,
    subscriptionPlanId: string,
  ): Promise<any> {
    try {
      const response = await axios.post(
        `${this.baseURL}/v1/notifications/webhooks`,
        {
          url: `${this.configService.get(configServiceKeys.BACKEND_LINK)}/paypal/webhook/callback/${subscriptionPlanId}`,
          event_types: [
            { name: '*' },
            // // 🔄 Subscription lifecycle
            // { name: 'BILLING.SUBSCRIPTION.CREATED' },
            // { name: 'BILLING.SUBSCRIPTION.ACTIVATED' },
            // { name: 'BILLING.SUBSCRIPTION.UPDATED' },
            // { name: 'BILLING.SUBSCRIPTION.SUSPENDED' },
            // { name: 'BILLING.SUBSCRIPTION.RE-ACTIVATED' },
            // { name: 'BILLING.SUBSCRIPTION.CANCELLED' },
            // { name: 'BILLING.SUBSCRIPTION.EXPIRED' },
            // { name: 'BILLING.SUBSCRIPTION.PAYMENT.FAILED' },

            // // 💰 Payment related to subscriptions
            // { name: 'PAYMENT.SALE.COMPLETED' },
            // { name: 'PAYMENT.SALE.DENIED' },
            // { name: 'PAYMENT.SALE.PENDING' },
            // { name: 'PAYMENT.SALE.REFUNDED' },
            // { name: 'PAYMENT.SALE.REVERSED' },
          ],
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        },
      );

      console.log('[PayPal] Webhook created:', response.data);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error(
          '[PayPal] Create Webhook Axios error:',
          error.response?.data || error.message,
        );
      } else {
        console.error('[PayPal] Unexpected error:', error);
      }
      throw new Error('Failed to create PayPal webhook');
    }
  }

  async deleteWebhook(accessToken: string, webhookId: string): Promise<any> {
    try {
      const response = await axios.delete(
        `${this.baseURL}/v1/notifications/webhooks/${webhookId}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        },
      );

      console.log('[PayPal] Webhook deleted:', response.data);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error(
          '[PayPal] Delete Webhook Axios error:',
          error.response?.data || error.message,
        );
      } else {
        console.error('[PayPal] Unexpected error:', error);
      }
      throw new Error('Failed to delete PayPal webhook');
    }
  }

  async getSubscription(
    accessToken: string,
    subscriptionId: string,
  ): Promise<any> {
    try {
      const response = await axios.get(
        `${this.baseURL}/v1/billing/subscriptions/${subscriptionId}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        },
      );

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error(
          '[PayPal] Subscription fetch Axios error:',
          error.response?.data || error.message,
        );
      } else {
        console.error('[PayPal] Unexpected error:', error);
      }
      throw new Error('Failed to get PayPal subscription');
    }
  }

  async cancelSubscription(
    accessToken: string,
    subscriptionId: string,
    reason: string,
  ): Promise<any> {
    try {
      const response = await axios.post(
        `${this.baseURL}/v1/billing/subscriptions/${subscriptionId}/cancel`,
        {
          reason,
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        },
      );

      console.log('[PayPal] Subscription canceled:', response.data);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error(
          '[PayPal] Subscription cancelation Axios error:',
          error.response?.data || error.message,
        );
      } else {
        console.error('[PayPal] Unexpected error:', error);
      }
      throw new Error('Failed to cancel PayPal subscription');
    }
  }
}
