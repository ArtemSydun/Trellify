import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { WebhookQueryDto } from '../dto/webhook.query.dto';
import { Webhook } from '../entities/webhook.entity';

@Injectable()
export class TrelloWebhookRepository {
  constructor(
    @InjectModel(Webhook.name)
    private TrelloWebhookModel: Model<Webhook>,
  ) {}

  async bulkUpdateWebhooks(operations: any[]): Promise<any> {
    return this.TrelloWebhookModel.bulkWrite(operations);
  }

  async findManyByIds(ids: string[]): Promise<Webhook[]> {
    return this.TrelloWebhookModel.find({
      id: { $in: ids },
    })
      .lean()
      .exec();
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
      subscribers: {
        $elemMatch: {
          trelloUserId: trelloUserId,
        },
      },
    })
      .lean()
      .exec();
  }

  async findWebhooksCreatedByUser(trelloUserId: string): Promise<Webhook[]> {
    return this.TrelloWebhookModel.find({
      'author.trelloUserId': trelloUserId,
    })
      .lean()
      .exec();
  }

  async updateById(id: string, updateData: Partial<Webhook>): Promise<Webhook> {
    const updatedTrelloWebhook = await this.TrelloWebhookModel.findOneAndUpdate(
      { id },
      { $set: updateData },
      { new: true, lean: true },
    )
      .lean()
      .exec();

    return updatedTrelloWebhook;
  }

  async create(webhook: Webhook): Promise<Webhook> {
    return await this.TrelloWebhookModel.create(webhook);
  }

  async deleteById(id: string): Promise<void> {
    return this.TrelloWebhookModel.findOneAndDelete({ id });
  }

  public async getAll(filters: WebhookQueryDto) {
    const {
      order = 'desc',
      orderBy = 'createdAt',
      limit = 10,
      page = 1,
      idModel,
      boardName,
      authorId,
      subscriberId,
      createdAt,
      updatedAt,
      fromDate,
      toDate,
    } = filters;

    const perPage = limit; // Elements per page
    const offset = (page - 1) * perPage; // Calculate skip amount

    const query: any = {};

    if (idModel) query.idModel = idModel;
    if (boardName) query.boardName = { $regex: boardName, $options: 'i' };
    if (authorId) query['author.trelloUserId'] = authorId;
    if (subscriberId) query['subscribers.trelloUserId'] = subscriberId;

    // Date filtering
    if (createdAt) query.createdAt = { $gte: new Date(createdAt) };
    if (updatedAt) query.updatedAt = { $gte: new Date(updatedAt) };
    if (fromDate || toDate) {
      query.createdAt = {};
      if (fromDate) query.createdAt.$gte = new Date(fromDate);
      if (toDate) query.createdAt.$lte = new Date(toDate);
    }

    // Define sorting order
    const sortOrder = order === 'asc' ? 1 : -1;

    // Get total count before pagination
    const total = await this.TrelloWebhookModel.countDocuments(query);

    // Fetch paginated results
    const webhooks = await this.TrelloWebhookModel.find(query)
      .sort({ [orderBy]: sortOrder })
      .skip(offset)
      .limit(perPage);

    return {
      total,
      totalPages: Math.ceil(total / perPage),
      limitPerPage: +perPage,
      currentPage: +page,
      data: webhooks,
    };
  }
}
