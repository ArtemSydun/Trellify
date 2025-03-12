import { forwardRef, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule, JwtModuleOptions } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { configServiceKeys } from 'src/common/enums/config-service-keys.enum';
import { DistributionModule } from 'src/distribution/distribution.module';
import { MailerModule } from 'src/mailer/mailer.module';
import { RedisModule } from 'src/redis/redis.module';
import { TelegramModule } from 'src/telegram/telegram.module';
import { TrelloModule } from 'src/trello/trello.module';
import { User, UserSchema } from 'src/user/entities/user.entity';
import { UsersModule } from 'src/user/users.module';
import { AuthController } from './controller/auth.controller';
import { AuthService } from './services/auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: User.name,
        schema: UserSchema,
      },
    ]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (
        configService: ConfigService,
      ): Promise<JwtModuleOptions> => {
        const secret =
          configService.get<string>(configServiceKeys.JWT_SECRET) || '';
        return {
          secret,
          signOptions: {
            expiresIn:
              configService.get<string>(configServiceKeys.JWT_EXPIRES_IN) ||
              '12h',
          },
        };
      },
    }),
    MailerModule,
    forwardRef(() => RedisModule),
    forwardRef(() => TrelloModule),
    forwardRef(() => UsersModule),
    forwardRef(() => TelegramModule),
    forwardRef(() => DistributionModule),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [JwtModule],
})
export class AuthModule {}
