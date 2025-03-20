import {
  forwardRef,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRedis } from '@nestjs-modules/ioredis';
import { Redis } from 'ioredis';
import { I18nContext } from 'nestjs-i18n';
import { I18nKeys } from 'src/common/enums/i18n-keys.enum';
import { SubscriptionService } from 'src/subscription/services/subscription.service';
import { dailyStatsKeys } from '../enums/daily-stats-keys.enum';
import { redisKeys } from '../enums/redis-keys.enum';

@Injectable()
export class RedisService {
  constructor(
    @InjectRedis() private readonly redis: Redis,
    @Inject(forwardRef(() => SubscriptionService))
    private readonly subscriptionService: SubscriptionService,
    private readonly jwtService: JwtService,
  ) {}

  async onModuleInit() {
    // UNIQUE USERS DELETION CODE BLOCK WILL BE USELESS AFTER ONE EXECUTION ON PROD.
    // REMOVE IT BEFORE NEXT PROD UPDATE

    // Fetch data from Redis
    const dailyStatsString = await this.getValue(redisKeys.DAILY_STATS);
    const weeklyStatsString = await this.getValue(redisKeys.WEEKLY_STATS);
    const subscriptionPlans = await this.getValue(redisKeys.SUBSCRIPTION_PLANS);

    // Initialize only if missing
    if (!subscriptionPlans) {
      console.log('Initializing subscription plans...');
      await this.initializeSubscriptionPlans();
    }

    if (!dailyStatsString) {
      console.log('Initializing daily stats...');
      await this.initializeDailyStats();
    }

    if (!weeklyStatsString) {
      console.log('Initializing weekly stats...');
      await this.initializeWeeklyStats();
    }

    if (dailyStatsString) {
      const dailyStats = JSON.parse(dailyStatsString);

      if ('uniqueUsers' in dailyStats) {
        console.log('Renaming uniqueUsers to loginnedUsers in dailyStats');

        // If loginnedUsers does not exist, move the data
        if (!('loginnedUsers' in dailyStats)) {
          dailyStats.loginnedUsers = dailyStats.uniqueUsers;
        }

        // Delete the old property
        delete dailyStats.uniqueUsers;

        // Save the updated data back to Redis
        await this.setValue(redisKeys.DAILY_STATS, JSON.stringify(dailyStats));
      }
    }

    if (weeklyStatsString) {
      const weeklyStats = JSON.parse(weeklyStatsString);

      if ('uniqueUsers' in weeklyStats) {
        console.log('Renaming uniqueUsers to loginnedUsers in weeklyStats');

        // If loginnedUsers does not exist, move the data
        if (!('loginnedUsers' in weeklyStats)) {
          weeklyStats.loginnedUsers = weeklyStats.uniqueUsers;
        }

        // Delete the old property
        delete weeklyStats.uniqueUsers;

        // Save the updated data back to Redis
        await this.setValue(
          redisKeys.WEEKLY_STATS,
          JSON.stringify(weeklyStats),
        );
      }
    }

    console.log('Cleanup completed successfully!');
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

  //IMPORTANT: this function clears ALL DATA STORED IN REDIS
  async clearRedisStorage(): Promise<string> {
    return await this.redis.flushall();
  }

  async initializeDailyStats(): Promise<string> {
    // Convert dailyStatsEnum values into an object with all values set to 0
    const dailyStatsVars = Object.values(dailyStatsKeys);
    const dailyStats = dailyStatsVars.reduce(
      (acc, key) => {
        acc[key] = 0;
        return acc;
      },
      {} as Record<string, number>,
    );

    return await this.setValue(
      redisKeys.DAILY_STATS,
      JSON.stringify(dailyStats),
    );
  }

  async initializeWeeklyStats(): Promise<string> {
    // Convert dailyStatsEnum values into an object with all values set to 0
    const weeklyStatsVars = Object.values(dailyStatsKeys);
    const weeklyStats = weeklyStatsVars.reduce(
      (acc, key) => {
        acc[key] = 0;
        return acc;
      },
      {} as Record<string, number>,
    );

    return await this.setValue(
      redisKeys.WEEKLY_STATS,
      JSON.stringify(weeklyStats),
    );
  }

  async initializeSubscriptionPlans(): Promise<string> {
    // Fetch all subscription plans
    const subscriptionPlans = await this.subscriptionService.findAll();

    // Transform array into an object with plan names as keys and notifications as values
    const subscriptionPlansObject = subscriptionPlans.reduce(
      (acc, plan) => {
        acc[plan.name] = plan.notifications;
        return acc;
      },
      {} as Record<string, any>,
    );

    // Store the transformed object in Redis
    return await this.setValue(
      redisKeys.SUBSCRIPTION_PLANS,
      JSON.stringify(subscriptionPlansObject),
    );
  }

  async updateDailyStats(key: string, value: number): Promise<string> {
    const dailyStats = await this.getValue(redisKeys.DAILY_STATS);

    const keyValue = JSON.parse(dailyStats)[key];

    const updatedDailyStats = {
      ...JSON.parse(dailyStats),
      [key]: keyValue + value,
    };

    return await this.setValue(
      redisKeys.DAILY_STATS,
      JSON.stringify(updatedDailyStats),
    );
  }

  async updateWeeklyStats(key: string, value: number): Promise<string> {
    const weeklyStats = await this.getValue(redisKeys.WEEKLY_STATS);

    const keyValue = JSON.parse(weeklyStats)[key];

    const updatedWeeklyStats = {
      ...JSON.parse(weeklyStats),
      [key]: keyValue + value,
    };

    return await this.setValue(
      redisKeys.WEEKLY_STATS,
      JSON.stringify(updatedWeeklyStats),
    );
  }

  async getSubscriptionPlans(): Promise<string> {
    return await this.getValue(redisKeys.SUBSCRIPTION_PLANS);
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
