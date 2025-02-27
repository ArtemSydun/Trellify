import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { RedisModule as NestRedisModule } from '@nestjs-modules/ioredis';
import { configServiceEnum } from 'src/common/enums/config.service.enum';
import { RedisService } from './services/redis.service';

@Module({
  imports: [
    NestRedisModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        type: 'single',
        url: configService.get(configServiceEnum.REDIS_URI),
      }),
    }),
  ],
  providers: [RedisService, JwtService],
  exports: [RedisService],
})
export class RedisModule {}
