import { Injectable, Logger } from '@nestjs/common';
import { RateLimiterMemory, RateLimiterAbstract } from 'rate-limiter-flexible';
// import Redis from 'ioredis'; // Uncomment if using Redis

@Injectable()
export class DiscordRateLimiterService {
  private readonly logger = new Logger(DiscordRateLimiterService.name);
  private limiter: RateLimiterAbstract;

  constructor() {
    // ✅ Use in-memory limiter (for development)
    this.limiter = new RateLimiterMemory({
      points: 3, // 3 actions
      duration: 15, // per 10 seconds
    });

    // ✅ Optional: Use Redis if needed
    // const redisClient = new Redis();
    // this.limiter = new RateLimiterRedis({
    //   storeClient: redisClient,
    //   keyPrefix: 'telegram_rl',
    //   points: 3,
    //   duration: 10,
    // });
  }

  /**
   * Checks if a user is rate limited for a specific action
   */
  async isLimited(
    userId: string,
    actionKey: string = 'global',
  ): Promise<boolean> {
    const key = `ds:${userId}:${actionKey}`;
    try {
      await this.limiter.consume(key);
      return false;
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (err) {
      this.logger.debug(`User ${userId} hit rate limit for ${actionKey}`);
      return true;
    }
  }

  /**
   * Get remaining TTL in seconds for a limited user
   */
  async getRemainingTTL(
    userId: string,
    actionKey: string = 'global',
  ): Promise<number> {
    const key = `ds:${userId}:${actionKey}`;
    try {
      const res = await this.limiter.get(key);
      return res?.msBeforeNext ?? 0;
    } catch {
      return 0;
    }
  }
}
