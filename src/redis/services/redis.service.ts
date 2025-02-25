import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRedis } from '@nestjs-modules/ioredis';
import { format } from 'date-fns';
import { Redis } from 'ioredis';
import { I18nContext } from 'nestjs-i18n';
import { I18nKeys } from 'src/common/enums/i18n-keys.enum';
import { dailyStatsEnum } from '../enums/daily-stats.enum';
import { redisKeysEnum } from '../enums/redis-keys.enum';

@Injectable()
export class RedisService {
  constructor(
    @InjectRedis() private readonly redis: Redis,
    private readonly jwtService: JwtService,
  ) {}

  async onModuleInit() {
    const exists = await this.getValue(redisKeysEnum.DAILY_STATS);

    if (!exists) {
      console.log('Initializing daily stats memory data');
      await this.initializeDailyStats();
    }
  }

  async testConnection(): Promise<string> {
    return await this.redis.ping(); // Should return 'PONG'
  }

  async setValue(key: string, value: string): Promise<string> {
    return await this.redis.set(key, value);
  }

  async getValue(key: string): Promise<string | null> {
    return await this.redis.get(key);
  }

  async getAllKeysValues(): Promise<Record<string, string>> {
    const keys = await this.redis.keys('*'); // Get all keys
    if (!keys.length) return {}; // Return empty object if no keys

    const values = await this.redis.mget(keys); // Get values for all keys

    // Return key-value pairs as an object
    return keys.reduce(
      (acc, key, index) => {
        acc[key] = values[index];
        return acc;
      },
      {} as Record<string, string>,
    );
  }

  async deleteValue(key: string): Promise<number> {
    return await this.redis.del(key);
  }

  async clearRedisStorage(): Promise<string> {
    return await this.redis.flushall();
  }

  async initializeDailyStats(): Promise<string> {
    const startOfToday = new Date();
    startOfToday.setUTCHours(0, 0, 0, 0);

    const formattedDate = format(startOfToday, 'dd-MM-yyyy');

    // Convert dailyStatsEnum values into an object with all values set to 0
    const dailyStatsKeys = Object.values(dailyStatsEnum);
    const dailyStats = dailyStatsKeys.reduce(
      (acc, key) => {
        acc[key] = 0;
        return acc;
      },
      {} as Record<string, number>,
    );

    await this.setValue(redisKeysEnum.LAST_DAILY_STATS_REFRESH, formattedDate);

    return await this.setValue(
      redisKeysEnum.DAILY_STATS,
      JSON.stringify(dailyStats),
    );
  }

  async updateDailyStats(key: string, value: number): Promise<string> {
    const dailyStats = await this.getValue(redisKeysEnum.DAILY_STATS);

    const keyValue = JSON.parse(dailyStats)[key];

    const updatedDailyStats = {
      ...JSON.parse(dailyStats),
      [key]: keyValue + value,
    };

    return await this.setValue(
      redisKeysEnum.DAILY_STATS,
      JSON.stringify(updatedDailyStats),
    );
  }

  async makeTokenInvalid(token: string): Promise<void> {
    const decoded: any = this.jwtService.decode(token);
    const tokenExpiry = decoded.exp * 1000; // JWT expiry is in seconds, so we convert to milliseconds.
    // Calculate the remaining time to live (TTL) for the token.
    const currentTime = Date.now();
    const ttl = tokenExpiry - currentTime;
    if (ttl > 0) {
      // Store the token in Redis with the remaining TTL.
      await this.redis.set(token, 'blacklisted', 'PX', ttl);
    }
  }

  async ifTokenBlacklisted(
    token: string,
    i18n?: I18nContext,
  ): Promise<boolean> {
    const isTokenBlacklisted = await this.getValue(token);

    if (isTokenBlacklisted) {
      throw new UnauthorizedException(
        i18n?.t(I18nKeys.ERRORS_JWT_INVALID_TOKEN),
      );
    }

    return false;
  }
}
