import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpStatus,
  Injectable,
  Logger,
} from '@nestjs/common';

import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { I18nContext } from 'nestjs-i18n';
import { AdminBotActionsEnum } from 'src/common/enums/admin-bot-actions.enum';
import { configServiceEnum } from 'src/common/enums/config.service.enum';

import { I18nKeys } from 'src/common/enums/i18n-keys.enum';
import { Languages, supportedLanguages } from 'src/common/enums/languages.enum';
import { hashPassword, verifyPassword } from 'src/common/helpers/hashing';
import { DefaultResponse } from 'src/common/interfaces/responses';
import { MailerService } from 'src/mailer/services/mailer.service';
import { AdminBotService } from 'src/telegram/admin-bot/admin-bot.service';
import { NotificationBotService } from 'src/telegram/notification-bot/notification-bot.service';
import { ChangeEmailDto } from 'src/user/dto/change-email.dto';
import { ChangePasswordDto } from 'src/user/dto/change-password.dto';
import { CreateUserDto } from 'src/user/dto/create-user.dto';
import { User } from 'src/user/entities/user.entity';
import { UserRoles } from 'src/user/enums/role.enum';
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
    private readonly adminBotService: AdminBotService,
  ) {}

  public verifyToken(token: string, i18n?: I18nContext): any {
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
    await verifyPassword(loginUserDto.password, user.password, i18n);

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

  public async initiateUserRegistration(
    createUserDto: CreateUserDto,
    i18n?: I18nContext,
  ): Promise<DefaultResponse<null>> {
    this.logger.log(
      `Initiating user registration for email: ${createUserDto.email}`,
    );

    const { email, password, timezone } = createUserDto;
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
      email,
      password,
      telegram: { username: null, chatId: null },
      trello: { userId: null, token: null, webhooks: [] },
      language,
      timezone: timezone !== 0 ? timezone / 60 : timezone,
    };

    const token = this.jwtService.sign(payload, { expiresIn: '1d' });

    await this.mailService.sendRegistrationLink(
      createUserDto.email,
      token,
      i18n,
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

  public async confirmUserRegistration(
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

    await this.adminBotService.notifyAdmins(
      AdminBotActionsEnum.USER_REGISTERED,
      newUser,
    );

    this.logger.log(`User registered successfully: ${email}`);
    return {
      message:
        i18n?.t(I18nKeys.MESSAGES_USER_CREATED) ||
        'User registered successfully',
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

    await this.mailService.sendResetPasswordLink(user.email, token, i18n);

    this.logger.log(`Password reset email sent to: ${user.email}`);
    return {
      message:
        i18n?.t(I18nKeys.MESSAGES_EMAIL_RESET_PASSWORD_SENT_MESSAGE, {
          args: {
            email: forgotPasswordDto.email,
          },
        }) || `Password reset email sent on ${user.email}`,
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
      message:
        i18n?.t(I18nKeys.MESSAGES_USER_PASSWORD_CHANGED_SUCCESSFULLY) ||
        'Password has been successfully changed',
      statusCode: HttpStatus.OK,
    };
  }

  public async initiateChangeUserEmail(
    userId: string,
    changeEmailDto: ChangeEmailDto,
    i18n?: I18nContext,
  ): Promise<DefaultResponse<null>> {
    const userToUpdate = await this.userRepository.findOneById(userId);
    const { newEmail, password } = changeEmailDto;

    if (userToUpdate.email === newEmail) {
      throw new ConflictException(
        i18n?.t(I18nKeys.ERRORS_AUTH_CHANGE_EMAIL_SAME_ADRESS) ||
          'New email must be different from current',
      );
    }

    await verifyPassword(password, userToUpdate.password, i18n);

    const payload = {
      id: userToUpdate.id,
      newEmail,
    };

    const token = this.jwtService.sign(payload, { expiresIn: '15m' });
    await this.mailService.sendChangeEmailLink(newEmail, token, i18n);

    return {
      message:
        i18n?.t(I18nKeys.MESSAGES_EMAIL_CHANGE_MAIL_SENT_MESSAGE, {
          args: { email: newEmail },
        }) || `Confirmation link sent on ${newEmail}`,
      statusCode: HttpStatus.OK,
    };
  }

  public async confirmChangeUserEmail(
    token: string,
    i18n?: I18nContext,
  ): Promise<DefaultResponse<null>> {
    const decoded = this.verifyToken(token);
    const { newEmail, id } = decoded;

    await this.userRepository.updateById(id, {
      email: newEmail,
    });

    return {
      message:
        i18n?.t(I18nKeys.MESSAGES_USER_EMAIL_CHANGED_SUCCESSFULLY) ||
        'Email changed succesfully',
      statusCode: HttpStatus.OK,
    };
  }

  public async initiateUserDeletion(
    requestedAuthor: string | User,
    userToDelete: string | User,
    i18n?: I18nContext,
  ): Promise<DefaultResponse<null>> {
    const requestAuthor = await this.userService.getUser(requestedAuthor, i18n);

    const targetUser = await this.userService.getUser(userToDelete, i18n);

    if (
      requestAuthor.role !== UserRoles.superadmin &&
      requestAuthor.id !== targetUser.id
    ) {
      throw new ForbiddenException(
        i18n?.t(I18nKeys.ERRORS_GENERAL_FORBIDDEN_RESOURCE) ||
          'Forbidden resource',
      );
    }

    // Prevent a superadmin from deleting themselves
    if (
      requestAuthor.role === UserRoles.superadmin &&
      requestAuthor.id === targetUser.id
    ) {
      throw new ForbiddenException(
        i18n?.t(I18nKeys.ERRORS_GENERAL_FORBIDDEN_RESOURCE) ||
          'Forbidden resource',
      );
    }

    const payload = {
      id: targetUser.id,
    };

    const token = this.jwtService.sign(payload, { expiresIn: '15m' });

    await this.mailService.sendDeleteProfileLink(targetUser.email, token, i18n);

    return {
      message:
        i18n?.t(I18nKeys.MESSAGES_EMAIL_DELETE_USER_MESSAGE, {
          args: { email: targetUser.email },
        }) || `Confirmation link sent on ${targetUser.email}`,
      statusCode: HttpStatus.OK,
    };
  }

  public async confirmUserDeletion(
    token: string,
    i18n?: I18nContext,
  ): Promise<DefaultResponse<null>> {
    const decoded = this.verifyToken(token);
    const { id } = decoded;

    return await this.userService.deleteUserById(id, id, i18n);
  }

  public async changeUserPassword(
    userId: string,
    changePasswordDto: ChangePasswordDto,
    i18n?: I18nContext,
  ): Promise<DefaultResponse<null>> {
    const userToUpdate = await this.userRepository.findOneById(userId);
    const { oldPassword, newPassword } = changePasswordDto;

    if (oldPassword === newPassword) {
      throw new ConflictException(
        i18n?.t(I18nKeys.ERRORS_AUTH_CHANGE_PASSWORD_SAME_PASS) ||
          'New password can not be the same as previous',
      );
    }

    await verifyPassword(oldPassword, userToUpdate.password, i18n);

    const hashedPassword = await hashPassword(newPassword);

    await this.userRepository.updateById(userToUpdate.id, {
      password: hashedPassword,
    });

    return {
      message:
        i18n?.t(I18nKeys.MESSAGES_USER_PASSWORD_CHANGED_SUCCESSFULLY) ||
        'Password changed successfully',
      statusCode: HttpStatus.OK,
    };
  }
}
