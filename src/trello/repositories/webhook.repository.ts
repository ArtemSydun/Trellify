import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { TrelloWebhook } from '../entities/webhook.entity';
import { WebhookDto } from '../dto/create-webhook.dto';


@Injectable()
export class TrelloWebhookRepository {
  constructor(
    @InjectModel(TrelloWebhook.name)
    private TrelloWebhookModel: Model<TrelloWebhook>,
  ) {}

  async findOneByBoardId(idModel: string): Promise<TrelloWebhook> {
    return this.TrelloWebhookModel.findOne({ idModel }).lean().exec();
  }

  async findOneById(id: string): Promise<TrelloWebhook> {
    return this.TrelloWebhookModel.findOne({ id }).lean().exec();
  }

  async updateById(
    id: string,
    updateData: Partial<TrelloWebhook>,
  ): Promise<TrelloWebhook> {
    const updatedTrelloWebhook = await this.TrelloWebhookModel
      .findOneAndUpdate({ id }, { $set: updateData }, { new: true, lean: true })
      .exec();

    return updatedTrelloWebhook;
  }

  async create(webhook: WebhookDto): Promise<TrelloWebhook> {
    return await this.TrelloWebhookModel.create(webhook);
  }

  async delete(id: string): Promise<void> {
    return this.TrelloWebhookModel.findOneAndDelete({ id });
  }

  async getAll(): Promise<TrelloWebhook[]> {
    return this.TrelloWebhookModel.find();
  }
}
