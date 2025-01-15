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
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>(configServiceEnum.MONGODB_URI),
      }),
      inject: [ConfigService],
    }),
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
  ],
  providers: [SeederService],
  exports: [MongooseModule],
})
export class DatabaseModule {}
