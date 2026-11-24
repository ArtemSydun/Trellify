import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateSubscriptionDto } from '../dto/create-subscription.dto';
import { Subscription } from '../entities/subscription.entity';
import { SubscriptionPlans } from '../enum/subscription-plan.enum';

@Injectable()
export class SubscriptionRepository {
  constructor(
    @InjectModel(Subscription.name)
    private SubscriptionModel: Model<Subscription>,
  ) {}

  async bulkUpdateSubscribtions(operations: any[]): Promise<any> {
    return this.SubscriptionModel.bulkWrite(operations);
  }

  async findOneById(id: string): Promise<Subscription> {
    return this.SubscriptionModel.findOne({ id }).lean().exec();
  }

  async findOneByPayPalPlanId(paypalPlanId: string): Promise<Subscription> {
    return this.SubscriptionModel.findOne({ paypalPlanId }).lean().exec();
  }

  async findOneByName(name: SubscriptionPlans): Promise<Subscription> {
    return this.SubscriptionModel.findOne({ name }).lean().exec();
  }

  async findAllSubscriptions(): Promise<Subscription[]> {
    return this.SubscriptionModel.find().lean().exec();
  }

  async existsByName(name: string): Promise<boolean> {
    const subscription = await this.SubscriptionModel.findOne({ name })
      .lean()
      .exec();
    return subscription !== null;
  }

  async updateById(
    id: string,
    updateData: Partial<Subscription>,
  ): Promise<Subscription> {
    const updatedSubscription = await this.SubscriptionModel.findOneAndUpdate(
      { id },
      { $set: updateData },
      { new: true, lean: true },
    ).exec();

    return updatedSubscription;
  }

  async create(subscription: CreateSubscriptionDto): Promise<Subscription> {
    return await this.SubscriptionModel.create(subscription);
  }

  async deleteById(id: string): Promise<void> {
    await this.SubscriptionModel.findOneAndDelete({ id });
    return;
  }
}
