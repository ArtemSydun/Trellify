import { forwardRef, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RedisModule as NestRedisModule } from '@nestjs-modules/ioredis';
import { AuthModule } from 'src/auth/auth.module';
import { configServiceKeys } from 'src/common/enums/config-service-keys.enum';
import { SubscriptionModule } from 'src/subscription/subscription.module';
import { RedisService } from './services/redis.service';

@Module({
  imports: [
    NestRedisModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        type: 'single',
        url: `redis://:${configService.get(configServiceKeys.REDIS_PASSWORD)}@${configService.get(configServiceKeys.REDIS_HOST)}:${configService.get(configServiceKeys.REDIS_PORT)}`,
      }),
    }),

    forwardRef(() => AuthModule),
    forwardRef(() => SubscriptionModule),
  ],
  providers: [RedisService],
  exports: [RedisService],
})
export class RedisModule {}
