import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { RedisModule as NestRedisModule } from '@nestjs-modules/ioredis';
import { RedisService } from './services/redis.service';

@Module({
  imports: [
    NestRedisModule.forRootAsync({
      imports: [ConfigModule],
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      useFactory: async (configService: ConfigService) => ({
        type: 'single',
        url: 'redis://localhost:6380',
      }),
    }),
  ],
  providers: [RedisService, JwtService],
  exports: [RedisService],
})
export class RedisModule {}
