import {
  Injectable,
  UnauthorizedException,
  ExecutionContext,
} from '@nestjs/common';
import { CanActivate } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import { I18nService } from 'nestjs-i18n';
import { I18nKeys } from 'src/common/enums/i18n-keys.enum';
import { User } from 'src/user/entities/user.entity';
import { UsersService } from 'src/user/services/users.service';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    @InjectRedis() private readonly redis: Redis,
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly i18n: I18nService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    console.log(process.env.JWT_SECRET);
    const request = context.switchToHttp().getRequest();
    const token = request.headers.authorization?.split(' ')[1];

    const requestLanguage = request.headers['accept-language'] || 'en';
    const i18nContext = request.i18nContext;

    console.log(token);
    if (!token) {
      throw new UnauthorizedException(
        this.i18n.t(I18nKeys.ERRORS_JWT_INVALID_TOKEN, {
          lang: requestLanguage,
        }),
      );
    }

    // Check if the token is blacklisted in Redis
    const isBlacklisted = await this.redis.get(token);
    if (isBlacklisted) {
      throw new UnauthorizedException(
        this.i18n.t(I18nKeys.ERRORS_JWT_INVALID_TOKEN, {
          lang: requestLanguage,
        }),
      );
    }

    let userPayload;

    // Validate the JWT and get the payload
    try {
      userPayload = this.jwtService.verify(token); // Verify and decode the token
      console.log(userPayload);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (err) {
      console.log(err);
      throw new UnauthorizedException(
        this.i18n.t(I18nKeys.ERRORS_JWT_INVALID_TOKEN, {
          lang: requestLanguage,
        }),
      );
    }

    if (!userPayload || !userPayload.email || !userPayload.hash) {
      throw new UnauthorizedException(
        this.i18n.t(I18nKeys.ERRORS_JWT_INVALID_TOKEN, {
          lang: requestLanguage,
        }),
      );
    }

    // Fetch the user from the database
    const dbUser: User | null = await this.usersService.findUserByEmail(
      userPayload.email,
      i18nContext,
    );

    // Get the hash from the userPayload
    const hashFromToken = userPayload.hash;

    // Compare last 10 characters of password hash
    const last10HashDb = dbUser.password?.slice(-10);
    const last10HashToken = hashFromToken?.slice(-10);

    if (
      dbUser.email !== userPayload.email ||
      last10HashDb !== last10HashToken
    ) {
      throw new UnauthorizedException(
        this.i18n.t(I18nKeys.ERRORS_JWT_INVALID_TOKEN, {
          lang: requestLanguage,
        }),
      );
    }

    // Attach full user object to request for further use in controllers
    delete dbUser.password;

    request.user = dbUser;
    return true;
  }
}
