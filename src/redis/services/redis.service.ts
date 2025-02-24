import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRedis } from '@nestjs-modules/ioredis';
import { Redis } from 'ioredis';
import { I18nContext } from 'nestjs-i18n';
import { I18nKeys } from 'src/common/enums/i18n-keys.enum';

@Injectable()
export class RedisService {
  constructor(
    @InjectRedis() private readonly redis: Redis,
    private readonly jwtService: JwtService,
  ) {}

  async testConnection(): Promise<string> {
    return await this.redis.ping(); // Should return 'PONG'
  }

  async setValue(key: string, value: string): Promise<string> {
    return await this.redis.set(key, value);
  }

  async getValue(key: string): Promise<string | null> {
    return await this.redis.get(key);
  }

  async getAllValues(): Promise<string[]> {
    return await this.redis.keys('*');
  }

  async deleteValue(key: string): Promise<number> {
    return await this.redis.del(key);
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
