import {
  Injectable,
  UnauthorizedException,
  ExecutionContext,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { InjectRedis } from '@nestjs-modules/ioredis';
import { Request } from 'express';
import Redis from 'ioredis';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(@InjectRedis() private readonly redis: Redis) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request: Request = context.switchToHttp().getRequest();
    const token = request.headers.authorization?.split(' ')[1];

    if (!token) {
      throw new UnauthorizedException('No token provided');
    }

    // Check if the token is blacklisted in Redis
    const isBlacklisted = await this.redis.get(token);
    console.log(isBlacklisted);
    if (isBlacklisted) {
      throw new UnauthorizedException('Token is blacklisted');
    }

    // Proceed with regular JWT validation
    return (await super.canActivate(context)) as boolean;
  }

  handleRequest(err, user) {
    if (err || !user) {
      throw err || new UnauthorizedException('Invalid or missing JWT token');
    }
    return user;
  }
}
