import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { configServiceEnum } from 'src/common/enums/config.service.enum';

import * as mongoose from 'mongoose';
import { SeederService } from './seeders/user.seeder';
import { User, UserSchema } from 'src/user/entities/user.entity';

//do not enable db debugging on prod
if (process.env.NODE_ENV === 'dev') {
  mongoose.set('debug', true);
}

@Module({
  imports: [
    ConfigModule.forRoot(),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>(configServiceEnum.MONGODB_URI),
      }),
      inject: [ConfigService],
    }),
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
    ]),
  ],
  providers: [SeederService],
  exports: [MongooseModule],
})
export class DatabaseModule { }
