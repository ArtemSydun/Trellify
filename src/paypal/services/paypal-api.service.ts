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
  private baseURL = this.sharedConfigService.getPaypalApiUrl(); // switch to live if needed

  public async getAccessToken(): Promise<string> {
    const auth = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString(
      'base64',
    );

    try {
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
    } catch (error: any) {
      this.handleError('[PayPal] Access Token Error', error);
    }
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
    } catch (error: any) {
      this.handleError('[PayPal] Find Webhook', error);
    }
  }

  async createWebhook(accessToken: string): Promise<any> {
    try {
      const response = await axios.post(
        `${this.baseURL}/v1/notifications/webhooks`,
        {
          url: `${this.configService.get(configServiceKeys.BACKEND_LINK)}/paypal/webhook/callback`,
          event_types: [
            { name: 'BILLING.SUBSCRIPTION.CREATED' },
            { name: 'BILLING.SUBSCRIPTION.ACTIVATED' },
            { name: 'BILLING.SUBSCRIPTION.CANCELLED' },
            { name: 'PAYMENT.SALE.COMPLETED' },
            { name: 'PAYMENT.SALE.REFUNDED' },
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
    } catch (error: any) {
      this.handleError('[PayPal] Create Webhook', error);
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
    } catch (error: any) {
      this.handleError('[PayPal] Delete Webhook', error);
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
    } catch (error: any) {
      this.handleError('[PayPal] Subscription Fetch', error);
    }
  }

  // from 2025 to 2030, could be refactored to accept dynamic dates
  async getSubscriptionTransactions(
    accessToken: string,
    subscriptionId: string,
  ): Promise<any> {
    try {
      const response = await axios.get(
        `${this.baseURL}/v1/billing/subscriptions/${subscriptionId}/transactions?start_time=2025-01-01T00:00:00.000Z&end_time=2030-01-01T00:00:00.000Z`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        },
      );

      return response.data;
    } catch (error: any) {
      this.handleError('[PayPal] Subscription Transactions Fetch', error);
    }
  }

  async pauseSubscription(
    accessToken: string,
    subscriptionId: string,
    reason: string,
  ): Promise<any> {
    try {
      const response = await axios.post(
        `${this.baseURL}/v1/billing/subscriptions/${subscriptionId}/suspend`,
        { reason },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        },
      );

      console.log('[PayPal] Subscription paused:', response.data);
      return response.data;
    } catch (error: any) {
      this.handleError('[PayPal] Pause Subscription', error);
    }
  }

  async activateSubscription(
    accessToken: string,
    subscriptionId: string,
  ): Promise<any> {
    try {
      const response = await axios.post(
        `${this.baseURL}/v1/billing/subscriptions/${subscriptionId}/activate`,
        { reason: 'Reactivating subscription' },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        },
      );

      console.log('[PayPal] Subscription reactivated:', response.data);
      return response.data;
    } catch (error: any) {
      this.handleError('[PayPal] Reactivate Subscription', error);
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
        { reason },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        },
      );

      console.log('[PayPal] Subscription canceled:', response.data);
      return response.data;
    } catch (error: any) {
      this.handleError('[PayPal] Cancel Subscription', error);
    }
  }

  // ✅ Simplified reusable error handler
  private handleError(
    context: string,
    error: any,
    translatedMessage?: string,
  ): never {
    console.error(
      `${context} error:`,
      error?.response?.data || error?.message || error,
    );
    throw new Error(translatedMessage || 'PayPal request failed');
  }
}
