import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from '../entities/user.entity';
import { CreateUserDto } from '../dto/create-user.dto';
import { UserSearchPath } from '../interfaces/query.enum';

@Injectable()
export class UsersRepository {
  constructor(
    @InjectModel(User.name)
    private UserModel: Model<User>,
  ) { }

  async bulkUpdateUsers(operations: any[]): Promise<any> {
    return this.UserModel.bulkWrite(operations);
  }

  async findOneByEmail(email: string): Promise<User> {
    return this.UserModel.findOne({ email }).lean().exec();
  }

  async findOneById(id: string): Promise<User> {
    return this.UserModel.findOne({ id }).lean().exec();
  }

  async findOneByTrelloId(trelloUserId: string): Promise<User> {
    return this.UserModel.findOne({ [UserSearchPath.TrelloUserId]: trelloUserId });
  }

  async findUserByProperty(path: UserSearchPath, value: any): Promise<User> {
    const query = {};

    if (Array.isArray(value)) {
      query[path] = { $in: value }; // if the value is an array, use `$in`
    } else {
      query[path] = value; // otherwise, match the exact value
    }

    return this.UserModel.findOne(query).lean().exec();
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

    delete updatedUser.password;
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

  async findUsersConnectedToWebhook(webhookId: string): Promise<User[]> {
    return this.UserModel.find({ [UserSearchPath.TrelloWebhooks]: { $in: [webhookId] } }).exec();
  }
}
