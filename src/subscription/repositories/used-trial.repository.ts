import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateUsedTrialDto } from '../dto/create-used-trial.dto';
import { UsedTrial } from '../entities/used-trial.entity';

@Injectable()
export class UsedTrialRepository {
  constructor(
    @InjectModel(UsedTrial.name)
    private UsedTrialModel: Model<UsedTrial>,
  ) {}

  async bulkUpdateUsedTrials(operations: any[]): Promise<any> {
    return this.UsedTrialModel.bulkWrite(operations);
  }

  async findOneByEmail(email: string): Promise<UsedTrial> {
    return this.UsedTrialModel.findOne({ email }).lean().exec();
  }

  async findOneByTrelloUserId(trelloUserId: string): Promise<UsedTrial> {
    return this.UsedTrialModel.findOne({ trelloUserId }).lean().exec();
  }

  async findOneByTrellifyUserId(userId: string): Promise<UsedTrial> {
    return this.UsedTrialModel.findOne({ userId }).lean().exec();
  }

  async findOneById(id: string): Promise<UsedTrial> {
    return this.UsedTrialModel.findOne({ id }).lean().exec();
  }

  async findAllUsedTrials(): Promise<UsedTrial[]> {
    return this.UsedTrialModel.find().lean().exec();
  }

  async updateById(
    id: string,
    updateData: Partial<UsedTrial>,
  ): Promise<UsedTrial> {
    const updatedSubscription = await this.UsedTrialModel.findOneAndUpdate(
      { id },
      { $set: updateData },
      { new: true, lean: true },
    ).exec();

    return updatedSubscription;
  }

  async create(usedTrial: CreateUsedTrialDto): Promise<UsedTrial> {
    return await this.UsedTrialModel.create(usedTrial);
  }

  async deleteById(id: string): Promise<void> {
    await this.UsedTrialModel.findOneAndDelete({ id });
    return;
  }
}
