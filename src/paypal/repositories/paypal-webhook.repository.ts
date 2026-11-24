import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreatePaypalWebhookDto } from '../dto/create-paypal-webhook.dto';
import { PaypalWebhook } from '../entities/paypal-webhook.entity';

@Injectable()
export class PaypalWebhookRepository {
  constructor(
    @InjectModel(PaypalWebhook.name)
    private PaypalWebhookModel: Model<PaypalWebhook>,
  ) {}

  async bulkUpdateSubscribtions(operations: any[]): Promise<any> {
    return this.PaypalWebhookModel.bulkWrite(operations);
  }

  async findOneById(id: string): Promise<PaypalWebhook> {
    return this.PaypalWebhookModel.findOne({ id }).lean().exec();
  }

  async findOneByPayPalPlanId(paypalPlanId: string): Promise<PaypalWebhook> {
    return this.PaypalWebhookModel.findOne({ paypalPlanId }).lean().exec();
  }

  async findOneByTrellifyPlanId(
    trellifyPlanId: string,
  ): Promise<PaypalWebhook> {
    return this.PaypalWebhookModel.findOne({ trellifyPlanId }).lean().exec();
  }

  async findAllPaypalWebhooks(): Promise<PaypalWebhook[]> {
    return this.PaypalWebhookModel.find().lean().exec();
  }

  async existsByName(name: string): Promise<boolean> {
    const PaypalWebhook = await this.PaypalWebhookModel.findOne({ name })
      .lean()
      .exec();
    return PaypalWebhook !== null;
  }

  async updateById(
    id: string,
    updateData: Partial<PaypalWebhook>,
  ): Promise<PaypalWebhook> {
    const updatedPaypalWebhook = await this.PaypalWebhookModel.findOneAndUpdate(
      { id },
      { $set: updateData },
      { new: true, lean: true },
    ).exec();

    return updatedPaypalWebhook;
  }

  async create(
    paypalWebhookDto: CreatePaypalWebhookDto,
  ): Promise<PaypalWebhook> {
    return await this.PaypalWebhookModel.create(paypalWebhookDto);
  }

  async deleteById(id: string): Promise<void> {
    await this.PaypalWebhookModel.findOneAndDelete({ id });
    return;
  }
}
