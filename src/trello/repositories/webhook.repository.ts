import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Webhook } from '../entities/webhook.entity';


@Injectable()
export class TrelloWebhookRepository {
  constructor(
    @InjectModel(Webhook.name)
    private TrelloWebhookModel: Model<Webhook>,
  ) { }

  async bulkUpdateWebhooks(operations: any[]): Promise<any> {
    return this.TrelloWebhookModel.bulkWrite(operations);
  }

  async findOneByBoardId(idModel: string): Promise<Webhook> {
    return this.TrelloWebhookModel.findOne({ idModel }).lean().exec();
  }

  async findOneById(id: string): Promise<Webhook> {
    return this.TrelloWebhookModel.findOne({ id }).lean().exec();
  }

  async findAll(): Promise<Webhook[]> {
    return this.TrelloWebhookModel.find().lean().exec();
  }

  async findWebhooksConnectedToUser(trelloUserId: string): Promise<Webhook[]> {
    return this.TrelloWebhookModel.find({
      subscribers: { $in: [trelloUserId] },
    }).exec();
  }

  async updateById(
    id: string,
    updateData: Partial<Webhook>,
  ): Promise<Webhook> {
    const updatedTrelloWebhook = await this.TrelloWebhookModel
      .findOneAndUpdate({ id }, { $set: updateData }, { new: true, lean: true })
      .exec();

    return updatedTrelloWebhook;
  }

  async create(webhook: Webhook): Promise<Webhook> {
    return await this.TrelloWebhookModel.create(webhook);
  }

  async delete(id: string): Promise<void> {
    return this.TrelloWebhookModel.findOneAndDelete({ id });
  }

  async getAll(): Promise<Webhook[]> {
    return this.TrelloWebhookModel.find();
  }
}
