import { Module } from '@nestjs/common';
import { AuthService } from './service/auth.service';
import { AuthController } from './controller/auth.controller';
import { UserRepository } from 'src/user/repositories/user.repository';
import { JwtModule, JwtModuleOptions } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from 'src/user/entities/user.entity';
import { UserService } from 'src/user/services/user.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MailerModule } from 'src/mailer/mailer.module';
import { configServiceEnum } from 'src/common/enums/config.service.enum';
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
        const secret = configService.get<string>(configServiceEnum.JWT_SECRET) || '';
        return {
          secret,
          signOptions: {
            expiresIn: configService.get<string>(configServiceEnum.JWT_EXPIRES_IN) || '12h',
          },
        };
      },
    }),
    MailerModule
  ],
  controllers: [AuthController],
  providers: [AuthService, UserRepository, UserService, JwtStrategy],
  exports: [JwtModule]
})
export class AuthModule { }
