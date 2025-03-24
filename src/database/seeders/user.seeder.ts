import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { configServiceKeys } from 'src/common/enums/config-service-keys.enum';
import { hashPassword } from 'src/common/helpers/hashing';
import { SubscriptionPlans } from 'src/subscription/enum/subscription-plan.enum';
import { User } from 'src/user/entities/user.entity';
import { UserRoles } from 'src/user/enums/role.enum';

@Injectable()
export class SeederService implements OnModuleInit {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<User>,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit() {
    await this.seedDatabase();
  }

  private async seedDatabase() {
    try {
      console.log('Seeding database...');

      const adminEmail = this.configService.get<string>(
        configServiceKeys.MONGODB_SUPERADMIN_EMAIL,
      );
      const adminPassword = this.configService.get<string>(
        configServiceKeys.MONGODB_SUPERADMIN_PASSWORD,
      );
      const otherProps = {
        telegram: {
          username: null,
          chatId: null,
          updatedAt: new Date(),
        },
        trello: {
          userId: null,
          token: null,
          webhooks: [],
        },
        discord: {
          userId: null,
          username: null,
          updatedAt: new Date(),
        },
      };

      const adminUsers = [
        {
          email: adminEmail,
          password: adminPassword,
          role: UserRoles.superadmin,
          subscription: {
            id: '',
            plan: SubscriptionPlans.LIFETIME,
            amount: 0,
            lastPaymentDate: null,
            nextPaymentDate: null,
          },
          ...otherProps,
        },
      ];

      const existingAdmins = await this.userModel.find({
        role: UserRoles.superadmin,
      });

      if (existingAdmins.length === 0) {
        console.log('No admin users found, seeding...');

        for (const admin of adminUsers) {
          const hashedPassword = await hashPassword(adminPassword);

          const existingUser = await this.userModel.findOne({
            email: admin.email,
          });
          if (!existingUser) {
            await this.userModel.create({
              ...admin,
              password: hashedPassword,
            });
            console.log(`Admin user ${admin.email} created.`);
          } else {
            console.log(`Admin user ${admin.email} already exists.`);
          }
        }
      } else {
        console.log('Admin users already exist.');
      }
    } catch (error) {
      console.error('Error seeding database:', error);
    }
  }
}
