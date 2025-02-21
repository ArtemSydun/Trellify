import { Injectable } from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import { Redis } from 'ioredis';

@Injectable()
export class RedisService {
  constructor(@InjectRedis() private readonly redis: Redis) {}

  async testConnection(): Promise<string> {
    return await this.redis.ping(); // Should return 'PONG'
  }

  async setValue(key: string, value: string): Promise<string> {
    return await this.redis.set(key, value);
  }

  async getValue(key: string): Promise<string | null> {
    return await this.redis.get(key);
  }

  async deleteValue(key: string): Promise<number> {
    return await this.redis.del(key);
  }
}
