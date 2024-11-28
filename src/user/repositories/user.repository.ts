import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from '../entities/user.entity';
import { CreateUserDto } from '../dto/create-user.dto';

@Injectable()
export class UserRepository {
  constructor(
    @InjectModel(User.name)
    private UserModel: Model<User>,
  ) { }

  async findOneByEmail(email: string): Promise<User> {
    return this.UserModel.findOne({ email }).lean().exec();
  }

  async findOneById(id: string): Promise<User> {
    return this.UserModel.findOne({ id }).lean().exec();
  }

  async existsByEmail(email: string): Promise<boolean> {
    const user = await this.UserModel.findOne({ email }).lean().exec();
    return user !== null;
  }

  async updateById(
    id: string,
    updateData: Partial<User>,
  ): Promise<User> {
    const updatedUser = await this.UserModel
      .findOneAndUpdate({ id }, { $set: updateData }, { new: true, lean: true })
      .exec();

    return updatedUser;
  }

  async create(user: CreateUserDto): Promise<User> {
    return await this.UserModel.create(user);
  }

  async delete(id: string): Promise<void> {
    return this.UserModel.findOneAndDelete({ id });
  }

  async getAll(): Promise<User[]> {
    return this.UserModel.find();
  }

  async findUsersByWebhook(webhookId: string): Promise<User[]> {
    return this.UserModel.find({ webhooks: { $in: [webhookId] } }).exec();
  }
}
