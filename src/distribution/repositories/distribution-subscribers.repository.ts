import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateDistributionSubscriberDto } from '../dto/create-distribution-subscriber.dto';
import { DistributionSubscriber } from '../entities/distribution-subscriber.entity';

@Injectable()
export class DistributionSubscribersRepository {
  constructor(
    @InjectModel(DistributionSubscriber.name)
    private DistributionSubscriberModel: Model<DistributionSubscriber>,
  ) {}

  async bulkUpdateSubscribers(operations: any[]): Promise<any> {
    return this.DistributionSubscriberModel.bulkWrite(operations);
  }

  async findOneByEmail(email: string): Promise<DistributionSubscriber> {
    return this.DistributionSubscriberModel.findOne({ email }).lean().exec();
  }

  async findOneById(id: string): Promise<DistributionSubscriber> {
    return this.DistributionSubscriberModel.findOne({ id }).lean().exec();
  }

  async findOneByTrellifyUserId(id: string): Promise<DistributionSubscriber> {
    return this.DistributionSubscriberModel.findOne({ trellifyUserId: id })
      .lean()
      .exec();
  }

  async findAllDistributionSubscribers(): Promise<DistributionSubscriber[]> {
    return this.DistributionSubscriberModel.find().lean().exec();
  }

  async existsByEmail(email: string): Promise<boolean> {
    const subscriber = await this.DistributionSubscriberModel.findOne({ email })
      .lean()
      .exec();
    return subscriber !== null;
  }

  async updateById(
    id: string,
    updateData: Partial<DistributionSubscriber>,
  ): Promise<DistributionSubscriber> {
    const updatedUser = await this.DistributionSubscriberModel.findOneAndUpdate(
      { id },
      { $set: updateData },
      { new: true, lean: true },
    ).exec();

    return updatedUser;
  }

  async create(
    subscriber: CreateDistributionSubscriberDto,
  ): Promise<DistributionSubscriber> {
    return await this.DistributionSubscriberModel.create(subscriber);
  }

  async deleteByEmail(email: string): Promise<void> {
    await this.DistributionSubscriberModel.findOneAndDelete({ email });
    return;
  }
}
