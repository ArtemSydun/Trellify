import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import * as mongoose from 'mongoose';
import { configServiceEnum } from 'src/common/enums/config.service.enum';

import { User, UserSchema } from 'src/user/entities/user.entity';
import { SeederService } from './seeders/user.seeder';

//do not enable db debugging on prod
if (process.env.NODE_ENV === 'development') {
  mongoose.set('debug', true);
}

@Module({
  imports: [
    ConfigModule.forRoot(),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const username = configService.get<string>(
          configServiceEnum.MONGODB_USERNAME,
        );
        const password = configService.get<string>(
          configServiceEnum.MONGODB_PASSWORD,
        );
        const host = configService.get<string>(
          configServiceEnum.MONGODB_HOSTNAME,
        );
        const port = configService.get<string>(configServiceEnum.MONGODB_PORT);

        return {
          uri: `mongodb://${username}:${password}@${host}:${port}/`,
        };
      },
    }),
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
  ],
  providers: [SeederService],
  exports: [MongooseModule],
})
export class DatabaseModule {}
