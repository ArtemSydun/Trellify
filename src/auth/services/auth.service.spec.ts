import { createMock } from '@golevelup/ts-jest';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpStatus,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { hashPassword, verifyPassword } from 'src/common/helpers/hashing';
import { MailerService } from 'src/mailer/services/mailer.service';
import { superAdminStub, userStub } from 'src/user/__mocks__/user.stub';
import { CreateUserDto } from 'src/user/dto/create-user.dto';
import { UsersService } from 'src/user/services/users.service';
import { ForgotPasswordDto } from '../dto/forgot-password.dto';
import { LoginUserDto } from '../dto/login.dto';
import { ResetPasswordDto } from '../dto/reset-password.dto';
import { AuthService } from './auth.service';
import { UsersRepository } from 'src/user/repositories/users.repository';
import { NotificationBotService } from 'src/telegram/notification-bot/notification-bot.service';
import { AdminBotService } from 'src/telegram/admin-bot/admin-bot.service';
import { AdminBotActionsEnum } from 'src/common/enums/admin-bot-actions.enum';
import { ChangeEmailDto } from 'src/user/dto/change-email.dto';
import { ChangePasswordDto } from 'src/user/dto/change-password.dto';

jest.mock('src/common/helpers/hashing', () => ({
  verifyPassword: jest.fn(),
  hashPassword: jest.fn(),
}));

describe('AuthService', () => {
  let originalDate = Date;

  let authService: AuthService;
  let jwtService: JwtService;
  let usersService: UsersService;
  let usersRepository: UsersRepository;
  let configService: ConfigService;
  let mailerService: MailerService;
  let notificationBotService: NotificationBotService;
  let adminBotService: AdminBotService;

  const fixedDate = superAdminStub().lastLoginDate;

  beforeEach(async () => {
    originalDate = global.Date;
    global.Date = class extends originalDate {
      constructor() {
        super();
        return fixedDate;
      }
    } as unknown as DateConstructor;
    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: JwtService, useValue: createMock<JwtService>() },
        { provide: UsersService, useValue: createMock<UsersService>() },
        { provide: UsersRepository, useValue: createMock<UsersRepository>() },
        { provide: ConfigService, useValue: createMock<ConfigService>() },
        { provide: MailerService, useValue: createMock<MailerService>() },
        {
          provide: NotificationBotService,
          useValue: createMock<NotificationBotService>(),
        },
        {
          provide: AdminBotService,
          useValue: createMock<AdminBotService>(),
        },
      ],
    }).compile();

    authService = moduleRef.get<AuthService>(AuthService);
    jwtService = moduleRef.get<JwtService>(JwtService);
    usersService = moduleRef.get<UsersService>(UsersService);
    usersRepository = moduleRef.get<UsersRepository>(UsersRepository);
    configService = moduleRef.get<ConfigService>(ConfigService);
    mailerService = moduleRef.get<MailerService>(MailerService);
    notificationBotService = moduleRef.get<NotificationBotService>(
      NotificationBotService,
    );
    adminBotService = moduleRef.get<AdminBotService>(AdminBotService);
  });

  describe('login', () => {
    it('should return access token and user object for valid credentials', async () => {
      const user = {
        ...superAdminStub(),
        telegram: { ...superAdminStub().telegram, username: 'old_username' },
      };

      delete user.password;

      const loginUserDto: LoginUserDto = {
        email: user.email,
        password: 'valid_password',
      };

      const mockTelegramUser = { username: 'new_telegram_username' };

      jest.spyOn(usersService, 'findUserByEmail').mockResolvedValue(user);
      jest.spyOn(jwtService, 'sign').mockReturnValue('mockToken');
      jest
        .spyOn(notificationBotService, 'fetchTelegramUser')
        .mockResolvedValue(mockTelegramUser);
      jest.spyOn(usersRepository, 'updateById').mockResolvedValue({
        ...user,
        telegram: { ...user.telegram, username: mockTelegramUser.username },
        lastLoginDate: fixedDate,
        lastActivityDate: fixedDate,
      });
      (verifyPassword as jest.Mock).mockResolvedValue(true);

      const result = await authService.login(loginUserDto);

      expect(usersService.findUserByEmail).toHaveBeenCalledWith(
        loginUserDto.email,
        undefined,
      );
      expect(verifyPassword).toHaveBeenCalledWith(
        loginUserDto.password,
        user.password,
        undefined,
      );
      expect(notificationBotService.fetchTelegramUser).toHaveBeenCalledWith(
        user.telegram.chatId,
      );
      expect(usersRepository.updateById).toHaveBeenCalledWith(user.id, {
        lastLoginDate: fixedDate,
        lastActivityDate: fixedDate,
        telegram: { ...user.telegram, username: mockTelegramUser.username },
      });
      expect(jwtService.sign).toHaveBeenCalledWith({
        email: user.email,
        id: user.id,
        role: user.role,
      });
      expect(result).toEqual({
        accessToken: 'mockToken',
        user: {
          ...user,
          telegram: { ...user.telegram, username: mockTelegramUser.username },
          lastLoginDate: fixedDate,
          lastActivityDate: fixedDate,
        },
      });
    });

    it('should throw BadRequestException for invalid credentials', async () => {
      const user = {
        ...superAdminStub(),
        password: 'hashedpassword',
        telegram: { chatId: 123456789, username: 'telegram_username' },
      };

      const loginUserDto: LoginUserDto = {
        email: user.email,
        password: 'wrongpassword',
      };

      jest.spyOn(usersService, 'findUserByEmail').mockResolvedValue(user);
      jest.spyOn(jwtService, 'sign').mockReturnValue('mockToken');

      (verifyPassword as jest.Mock).mockRejectedValue(
        new BadRequestException(),
      );

      await expect(authService.login(loginUserDto)).rejects.toThrow(
        BadRequestException,
      );

      expect(usersService.findUserByEmail).toHaveBeenCalledWith(
        loginUserDto.email,
        undefined,
      );
      expect(verifyPassword).toHaveBeenCalledWith(
        loginUserDto.password,
        user.password,
        undefined,
      );
      expect(notificationBotService.fetchTelegramUser).not.toHaveBeenCalled();
    });
  });

  describe('initiateRegistration', () => {
    it('should send a confirmation link on successful registration', async () => {
      const createUserDto: CreateUserDto = {
        email: 'test@gmail.com',
        password: 'password123',
        timezone: 0,
      };
      const mockedToken = 'mockToken';

      jest.spyOn(usersService, 'doesUserExist').mockResolvedValue(false);
      jest.spyOn(jwtService, 'sign').mockReturnValue(mockedToken);
      jest.spyOn(configService, 'get').mockReturnValue('http://localhost');
      jest
        .spyOn(mailerService, 'getLink')
        .mockReturnValue(`http://localhost/auth/confirm/${mockedToken}`);

      const result = await authService.initiateUserRegistration(
        createUserDto,
        undefined,
      );

      expect(usersService.doesUserExist).toHaveBeenCalledWith(
        createUserDto.email,
      );
      expect(jwtService.sign).toHaveBeenCalledWith(
        expect.objectContaining({ email: createUserDto.email }),
        { expiresIn: '1d' },
      );
      expect(mailerService.sendRegistrationLink).toHaveBeenCalledWith(
        createUserDto.email,
        mockedToken,
        undefined,
      );
      expect(result).toEqual({
        message: expect.stringContaining(createUserDto.email),
        statusCode: HttpStatus.OK,
      });
    });

    it('should throw ConflictException if the user already exists', async () => {
      const createUserDto: CreateUserDto = {
        email: 'test@gmail.com',
        password: 'password123',
        timezone: 0,
      };

      jest.spyOn(usersService, 'doesUserExist').mockResolvedValue(true);

      await expect(
        authService.initiateUserRegistration(createUserDto),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('confirmRegistration', () => {
    it('should confirm registration, create user, notify admins, and return success message', async () => {
      jest.spyOn(authService, 'verifyToken').mockReturnValue({
        email: 'test@example.com',
        password: 'hashedpassword',
        username: 'testuser',
      });

      const response = await authService.confirmUserRegistration(
        'mockToken',
        undefined,
      );

      expect(usersService.createUser).toHaveBeenCalledWith(
        {
          email: 'test@example.com',
          password: 'hashedpassword',
          username: 'testuser',
        },
        undefined,
      );

      expect(adminBotService.notifyAdmins).toHaveBeenCalledWith(
        AdminBotActionsEnum.USER_REGISTERED,
        {
          email: 'test@example.com',
          password: 'hashedpassword',
          username: 'testuser',
        },
      );

      expect(response).toEqual({
        message: expect.any(String),
        statusCode: HttpStatus.OK,
      });
    });
  });

  describe('forgotPassword', () => {
    it('should send a password reset email', async () => {
      const forgotPasswordDto: ForgotPasswordDto = {
        email: 'test@gmail.com',
      };
      const user = superAdminStub();
      jest.spyOn(usersService, 'findUserByEmail').mockResolvedValue(user);
      jest.spyOn(jwtService, 'sign').mockReturnValue('mockResetToken');
      jest.spyOn(mailerService, 'sendResetPasswordLink').mockResolvedValue();

      const result = await authService.forgotPassword(
        forgotPasswordDto,
        undefined,
      );

      expect(usersService.findUserByEmail).toHaveBeenCalledWith(
        forgotPasswordDto.email,
        undefined,
      );
      expect(jwtService.sign).toHaveBeenCalled();
      expect(mailerService.sendResetPasswordLink).toHaveBeenCalledWith(
        user.email,
        'mockResetToken',
        undefined,
      );
      expect(result).toEqual({
        message: expect.stringContaining(forgotPasswordDto.email),
        statusCode: HttpStatus.OK,
      });
    });
  });

  describe('resetPassword', () => {
    it('should reset the user password', async () => {
      const token = 'mockToken';
      const resetPasswordDto: ResetPasswordDto = {
        newPassword: 'newpassword123',
        repeatPassword: 'newpassword123',
      };

      jest
        .spyOn(jwtService, 'verify')
        .mockReturnValue({ id: superAdminStub().id });
      jest.spyOn(usersService, 'resetPassword').mockResolvedValue();

      await authService.resetPassword(token, resetPasswordDto, undefined);

      expect(jwtService.verify).toHaveBeenCalledWith(token);
      expect(usersService.resetPassword).toHaveBeenCalledWith(
        superAdminStub().id,
        resetPasswordDto.newPassword,
        undefined,
      );
    });

    it('should throw BadRequestException if passwords do not match', async () => {
      const token = 'mockToken';
      const resetPasswordDto: ResetPasswordDto = {
        newPassword: 'newpassword123',
        repeatPassword: 'differentpassword',
      };

      await expect(
        authService.resetPassword(token, resetPasswordDto),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('initiateChangeUserEmail', () => {
    it('should send a confirmation link for email change', async () => {
      const userStub = { ...superAdminStub(), password: 'correctPassword' };
      const changeEmailDto: ChangeEmailDto = {
        newEmail: 'newemail@example.com',
        password: userStub.password,
      };

      jest.spyOn(usersRepository, 'findOneById').mockResolvedValue(userStub);
      (verifyPassword as jest.Mock).mockResolvedValue(true); // Mock password validation to fail

      jest.spyOn(jwtService, 'sign').mockReturnValue('mockToken');
      jest
        .spyOn(mailerService, 'sendChangeEmailLink')
        .mockResolvedValue(undefined);

      const result = await authService.initiateChangeUserEmail(
        userStub.id,
        changeEmailDto,
        undefined,
      );

      expect(usersRepository.findOneById).toHaveBeenCalledWith(userStub.id);
      expect(verifyPassword).toHaveBeenCalledWith(
        changeEmailDto.password,
        userStub.password,
        undefined,
      );
      expect(jwtService.sign).toHaveBeenCalled();
      expect(mailerService.sendChangeEmailLink).toHaveBeenCalledWith(
        changeEmailDto.newEmail,
        'mockToken',
        undefined,
      );

      expect(result).toEqual({
        message: expect.stringContaining(changeEmailDto.newEmail),
        statusCode: HttpStatus.OK,
      });
    });

    it('should throw ConflictException if new email is the same as current email', async () => {
      const userStub = superAdminStub();
      const changeEmailDto: ChangeEmailDto = {
        newEmail: userStub.email,
        password: 'correctpassword',
      };

      jest.spyOn(usersRepository, 'findOneById').mockResolvedValue(userStub);

      await expect(
        authService.initiateChangeUserEmail(userStub.id, changeEmailDto),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('confirmChangeUserEmail', () => {
    it('should update user email successfully', async () => {
      const userStub = superAdminStub();
      const token = 'mockToken';
      const decodedToken = {
        id: userStub.id,
        newEmail: 'newemail@example.com',
      };

      jest.spyOn(authService, 'verifyToken').mockReturnValue(decodedToken);
      jest.spyOn(usersService, 'updateUser').mockResolvedValue(undefined);

      const result = await authService.confirmChangeUserEmail(token, undefined);

      expect(authService.verifyToken).toHaveBeenCalledWith(token);
      expect(usersRepository.updateById).toHaveBeenCalledWith(userStub.id, {
        email: decodedToken.newEmail,
      });

      expect(result).toEqual({
        message: expect.any(String),
        statusCode: HttpStatus.OK,
      });
    });

    it('should throw an error if token is invalid', async () => {
      const token = 'invalidToken';

      jest.spyOn(authService, 'verifyToken').mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(authService.confirmChangeUserEmail(token)).rejects.toThrow(
        Error,
      );
    });
  });

  describe('initiateUserDeletion', () => {
    it('should allow a superadmin to delete any user', async () => {
      const requestAuthor = superAdminStub();
      const targetUser = userStub();

      jest
        .spyOn(usersService, 'getUser')
        .mockImplementation(async (id) =>
          id === superAdminStub().id ? requestAuthor : targetUser,
        );
      jest.spyOn(jwtService, 'sign').mockReturnValue('mockToken');
      jest.spyOn(mailerService, 'sendDeleteProfileLink').mockResolvedValue();

      const result = await authService.initiateUserDeletion(
        requestAuthor.id,
        targetUser.id,
      );

      expect(usersService.getUser).toHaveBeenCalledTimes(2);
      expect(jwtService.sign).toHaveBeenCalledWith(
        { id: targetUser.id },
        { expiresIn: '15m' },
      );
      expect(mailerService.sendDeleteProfileLink).toHaveBeenCalledWith(
        targetUser.email,
        'mockToken',
        undefined,
      );
      expect(result).toEqual({
        message: expect.stringContaining(targetUser.email),
        statusCode: HttpStatus.OK,
      });
    });

    it('should allow a user to delete their own account', async () => {
      const user = userStub();

      jest.spyOn(usersService, 'getUser').mockResolvedValue(user);
      jest.spyOn(jwtService, 'sign').mockReturnValue('mockToken');
      jest.spyOn(mailerService, 'sendDeleteProfileLink').mockResolvedValue();

      const result = await authService.initiateUserDeletion(user.id, user.id);

      expect(jwtService.sign).toHaveBeenCalledWith(
        { id: user.id },
        { expiresIn: '15m' },
      );
      expect(mailerService.sendDeleteProfileLink).toHaveBeenCalledWith(
        user.email,
        'mockToken',
        undefined,
      );
      expect(result).toEqual({
        message: expect.stringContaining(user.email),
        statusCode: HttpStatus.OK,
      });
    });

    it('should prevent a non-superadmin from deleting another user', async () => {
      const requestAuthor = { ...userStub() };
      const targetUser = { ...userStub(), id: 'otherId' };

      jest
        .spyOn(usersService, 'getUser')
        .mockImplementation(async (id) =>
          id === requestAuthor.id ? requestAuthor : targetUser,
        );

      await expect(
        authService.initiateUserDeletion(requestAuthor.id, targetUser.id),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should prevent a superadmin from deleting themselves', async () => {
      const requestAuthor = superAdminStub();

      jest.spyOn(usersService, 'getUser').mockResolvedValue(requestAuthor);

      await expect(
        authService.initiateUserDeletion(requestAuthor.id, requestAuthor.id),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('confirmUserDeletion', () => {
    it('should delete the user when a valid token is provided', async () => {
      const userId = '2';

      jest.spyOn(authService, 'verifyToken').mockReturnValue({ id: userId });
      jest.spyOn(usersService, 'deleteUserById').mockResolvedValue({
        message: 'User deleted',
        statusCode: HttpStatus.OK,
      });

      const result = await authService.confirmUserDeletion('validToken');

      expect(authService.verifyToken).toHaveBeenCalledWith('validToken');
      expect(usersService.deleteUserById).toHaveBeenCalledWith(
        userId,
        userId,
        undefined,
      );
      expect(result).toEqual({
        message: 'User deleted',
        statusCode: HttpStatus.OK,
      });
    });

    it('should throw BadRequestException if the token is invalid', async () => {
      jest.spyOn(authService, 'verifyToken').mockImplementation(() => {
        throw new BadRequestException('Invalid token');
      });

      await expect(
        authService.confirmUserDeletion('invalidToken'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('changeUserPassword', () => {
    it('should change the user password successfully', async () => {
      const userStub = superAdminStub();
      const changePasswordDto: ChangePasswordDto = {
        oldPassword: 'correctpassword',
        newPassword: 'newsecurepassword',
      };

      const hashedPassword = 'hashedPassword';

      jest.spyOn(usersRepository, 'findOneById').mockResolvedValue(userStub);
      (verifyPassword as jest.Mock).mockResolvedValue(true);
      (hashPassword as jest.Mock).mockResolvedValue(hashedPassword); // Mock password validation to fail

      jest.spyOn(usersRepository, 'updateById').mockResolvedValue(undefined);

      const result = await authService.changeUserPassword(
        userStub.id,
        changePasswordDto,
        undefined,
      );

      expect(usersRepository.findOneById).toHaveBeenCalledWith(userStub.id);
      expect(verifyPassword).toHaveBeenCalledWith(
        changePasswordDto.oldPassword,
        userStub.password,
        undefined,
      );
      expect(hashPassword).toHaveBeenCalledWith(changePasswordDto.newPassword);
      expect(usersRepository.updateById).toHaveBeenCalledWith(userStub.id, {
        password: 'hashedPassword',
      });

      expect(result).toEqual({
        message: expect.any(String),
        statusCode: HttpStatus.OK,
      });
    });

    it('should throw ConflictException if the new password is the same as the old password', async () => {
      const userStub = superAdminStub();
      const changePasswordDto: ChangePasswordDto = {
        oldPassword: 'samepassword',
        newPassword: 'samepassword',
      };

      jest.spyOn(usersRepository, 'findOneById').mockResolvedValue(userStub);

      await expect(
        authService.changeUserPassword(userStub.id, changePasswordDto),
      ).rejects.toThrow(ConflictException);
    });
  });
});
