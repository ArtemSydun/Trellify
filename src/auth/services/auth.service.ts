import {
  BadRequestException,
  ConflictException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';

import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { I18nContext } from 'nestjs-i18n';
import { configServiceEnum } from 'src/common/enums/config.service.enum';

import { I18nKeys } from 'src/common/enums/i18n-keys.enum';
import { Languages, supportedLanguages } from 'src/common/enums/languages.enum';
import { verifyPassword } from 'src/common/helpers/hashing';
import { DefaultResponse } from 'src/common/interfaces/responses';
import { MailerService } from 'src/mailer/services/mailer.service';
import { NotificationBotService } from 'src/telegram/notification-bot/notification-bot.service';
import { CreateUserDto } from 'src/user/dto/create-user.dto';
import { User } from 'src/user/entities/user.entity';
import { UsersRepository } from 'src/user/repositories/users.repository';
import { UsersService } from 'src/user/services/users.service';
import { ForgotPasswordDto } from '../dto/forgot-password.dto';
import { LoginUserDto } from '../dto/login.dto';
import { ResetPasswordDto } from '../dto/reset-password.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly userService: UsersService,
    private readonly userRepository: UsersRepository,
    private readonly configService: ConfigService,
    private readonly mailService: MailerService,
    private readonly notificationBotService: NotificationBotService,
  ) {}

  private verifyToken(token: string, i18n?: I18nContext): any {
    try {
      const decoded = this.jwtService.verify(token);
      return decoded;
    } catch (err) {
      this.logger.error('Invalid or expired token', err.stack);
      throw new BadRequestException(
        i18n?.t(I18nKeys.ERRORS_JWT_INVALID_TOKEN) ||
          'Your token is not valid or expired',
      );
    }
  }

  public async login(
    loginUserDto: LoginUserDto,
    i18n?: I18nContext,
  ): Promise<{ accessToken: string; user: Partial<User> }> {
    const user = await this.userService.findUserByEmail(
      loginUserDto.email,
      i18n,
    );
    const loginDate = new Date();

    // Validate password
    const isCredentialsValid = await verifyPassword(
      loginUserDto.password,
      user.password,
    );

    if (!isCredentialsValid) {
      this.logger.warn(`Invalid credentials for email: ${loginUserDto.email}`);
      throw new UnauthorizedException(
        i18n?.t(I18nKeys.ERRORS_GENERAL_INVALID_CREDENTIALS) ||
          'Invalid credentials.',
      );
    }

    let updatedTelegramUsername = user.telegram.username;

    if (user.telegram.chatId) {
      const telegramUserProfile =
        await this.notificationBotService.fetchTelegramUser(
          user.telegram.chatId,
        );

      if (telegramUserProfile.username) {
        updatedTelegramUsername = telegramUserProfile.username;
      }
    }

    const updatedUser = await this.userRepository.updateById(user.id, {
      lastLoginDate: loginDate,
      lastActivityDate: loginDate,
      telegram: {
        ...user.telegram,
        username: updatedTelegramUsername,
      },
    });

    delete updatedUser.password;

    const payload = {
      email: updatedUser.email,
      id: updatedUser.id,
      role: updatedUser.role,
    };
    const token: string = this.jwtService.sign(payload);

    this.logger.log(`User logged in successfully: ${updatedUser.email}`);

    return {
      accessToken: token,
      user: updatedUser,
    };
  }

  public async initiateRegistration(
    createUserDto: CreateUserDto,
    i18n?: I18nContext,
  ): Promise<DefaultResponse<null>> {
    this.logger.log(
      `Initiating user registration for email: ${createUserDto.email}`,
    );

    const language = supportedLanguages.includes(
      i18n?.lang?.split('-')[0] as Languages,
    )
      ? i18n?.lang?.split('-')[0]
      : Languages.EN;

    const userByEmail = await this.userService.doesUserExist(
      createUserDto.email,
    );

    if (userByEmail) {
      this.logger.warn(`User ${createUserDto.email} already exists`);
      throw new ConflictException(
        i18n?.t(I18nKeys.ERRORS_USER_ALREADY_EXIST, {
          args: { email: createUserDto.email },
        }) || `User ${createUserDto.email} already exists`,
      );
    }

    const payload = {
      email: createUserDto.email,
      password: createUserDto.password,
      telegram: { username: null, chatId: null },
      trello: { userId: null, token: null, webhooks: [] },
      language,
      timezone: createUserDto.timezone / 60,
    };

    const token = this.jwtService.sign(payload, { expiresIn: '1d' });

    const confirmationLink = this.mailService.getLink(
      this.configService.get(configServiceEnum.FRONTEND_LINK),
      `auth/confirm/${token}`,
      i18n?.t(I18nKeys.MESSAGES_EMAIL_REGISTRATION_EMAIL_SUBJECT) ||
        `Confirm your email`,
    );

    await this.mailService.sendDistribution(
      this.configService.get(configServiceEnum.MAILER_SENDER),
      createUserDto.email,
      {
        subject:
          i18n?.t(I18nKeys.MESSAGES_EMAIL_REGISTRATION_EMAIL_SUBJECT) ||
          `Confirm your email`,
        html: `<p>${
          i18n?.t(I18nKeys.MESSAGES_EMAIL_REGISTRATION_EMAIL_MESSAGE) ||
          `Please confirm your email by clicking the following link`
        }: ${confirmationLink}</p>`,
      },
    );

    this.logger.log(`Confirmation link sent to ${createUserDto.email}`);
    return {
      message:
        i18n?.t(I18nKeys.MESSAGES_EMAIL_REGISTRATION_EMAIL_SENT_MESSAGE, {
          args: { email: createUserDto.email },
        }) || `Confirmation link sent to your email ${createUserDto.email}`,
      statusCode: HttpStatus.OK,
    };
  }

  public async confirmRegistration(
    token: string,
    i18n?: I18nContext,
  ): Promise<DefaultResponse<null>> {
    const decoded = this.verifyToken(token);
    const { email, password, ...userData } = decoded;

    const newUser = {
      email,
      password,
      ...userData,
    };
    await this.userService.createUser(newUser, i18n);

    this.logger.log(`User registered successfully: ${email}`);
    return {
      message: 'User registered successfully',
      statusCode: HttpStatus.OK,
    };
  }

  public async forgotPassword(
    forgotPasswordDto: ForgotPasswordDto,
    i18n?: I18nContext,
  ): Promise<DefaultResponse<null>> {
    const user = await this.userService.findUserByEmail(
      forgotPasswordDto.email,
      i18n,
    );
    const token: string = this.jwtService.sign(
      { id: user.id },
      {
        expiresIn: this.configService.get(
          configServiceEnum.JWT_EXPIRES_PASSWORD,
        ),
      },
    );

    await this.mailService.sendResetPasswordLink(user.email, token);

    this.logger.log(`Password reset email sent to: ${user.email}`);
    return {
      message: `Password reset email sent on ${user.email}`,
      statusCode: HttpStatus.OK,
    };
  }

  public async resetPassword(
    token: string,
    resetPasswordDto: ResetPasswordDto,
    i18n?: I18nContext,
  ): Promise<DefaultResponse<null>> {
    const { newPassword, repeatPassword } = resetPasswordDto;

    if (newPassword !== repeatPassword) {
      this.logger.warn('Password mismatch during reset');
      throw new BadRequestException(
        i18n?.t(I18nKeys.ERRORS_AUTH_RESET_PASSWORD_MISMATCH) ||
          `Password and repeat password does not match`,
      );
    }

    const { id } = this.verifyToken(token);

    await this.userService.resetPassword(id, newPassword, i18n);

    this.logger.log(`Password successfully reset for user ID: ${id}`);

    return {
      message: 'Password changed successfully',
      statusCode: HttpStatus.OK,
    };
  }
}
