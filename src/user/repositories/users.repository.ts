import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { DefaultPaginatedResponse } from 'src/common/interfaces/responses';
import { CreateUserDto } from '../dto/create-user.dto';
import { UserQueryDto } from '../dto/user.query.dto';
import { User } from '../entities/user.entity';
import { UserSearchPath } from '../enums/query.enum';
import { UserRoles } from '../enums/role.enum';

@Injectable()
export class UsersRepository {
  constructor(
    @InjectModel(User.name)
    private UserModel: Model<User>,
  ) {}

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
    return this.UserModel.findOne({
      [UserSearchPath.TrelloUserId]: trelloUserId,
    })
      .lean()
      .exec();
  }

  async findAdmins(): Promise<User[]> {
    return this.UserModel.find({
      role: { $in: [UserRoles.admin, UserRoles.superadmin] },
      // [UserSearchPath.TelegramChatId]: { $exists: true, $ne: null },
    }).exec();
  }

  async findManyByTrelloIds(trelloUserIds: string[]): Promise<User[]> {
    return this.UserModel.find({
      [UserSearchPath.TrelloUserId]: { $in: trelloUserIds },
    })
      .lean()
      .exec();
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

  async updateById(id: string, updateData: Partial<User>): Promise<User> {
    const updatedUser = await this.UserModel.findOneAndUpdate(
      { id },
      { $set: updateData },
      { new: true, lean: true },
    ).exec();

    delete updatedUser.password;
    return updatedUser;
  }

  async create(user: CreateUserDto): Promise<User> {
    return await this.UserModel.create(user);
  }

  async delete(id: string): Promise<void> {
    return this.UserModel.findOneAndDelete({ id });
  }

  public async getAll(
    filters: UserQueryDto,
  ): Promise<DefaultPaginatedResponse<User>> {
    const {
      order = 'desc',
      orderBy = 'createdAt',
      limit = 10,
      page = 1,
      email,
      role,
      date,
      fromDate,
      toDate,
      trelloUserId,
      trelloUserName,
      telegramChatId,
      telegramUserName,
      language,
    } = filters;
    const perPage = limit; // Elements per page
    const offset = (page - 1) * perPage; // Calculate skip amount

    const query: any = {};

    if (email) query.email = { $regex: email, $options: 'i' };
    if (role) query.role = role;
    if (date && (fromDate || toDate)) {
      query[date] = {}; // Dynamically assign the date field
      if (fromDate) query[date].$gte = new Date(fromDate);
      if (toDate) query[date].$lte = new Date(toDate);
    }
    if (trelloUserId) query[UserSearchPath.TrelloUserId] = trelloUserId;
    if (trelloUserName)
      query[UserSearchPath.TrelloUsername] = {
        $regex: trelloUserName,
        $options: 'i',
      };
    if (telegramChatId) query[UserSearchPath.TelegramChatId] = +telegramChatId;
    if (telegramUserName)
      query[UserSearchPath.TelegramUsername] = {
        $regex: telegramUserName,
        $options: 'i',
      };
    if (language) query.language = language;

    // Define sorting
    const sortOrder = order === 'asc' ? 1 : -1;

    // Get total query count
    const total = await this.UserModel.countDocuments(query);

    // Fetch paginated results
    const users = await this.UserModel.find(query)
      .sort({ [orderBy]: sortOrder })
      .skip(offset)
      .limit(perPage);

    return {
      total,
      totalPages: Math.ceil(total / perPage),
      limitPerPage: +perPage,
      currentPage: +page,
      data: users,
    };
  }

  async findUsersConnectedToWebhook(webhookId: string): Promise<User[]> {
    return this.UserModel.find({
      [UserSearchPath.TrelloWebhooksIds]: webhookId,
    }).exec();
  }
}
