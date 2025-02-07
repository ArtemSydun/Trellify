import { createMock } from '@golevelup/ts-jest';
import {
  BadRequestException,
  ConflictException,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { verifyPassword } from 'src/common/helpers/hashing';
import { MailerService } from 'src/mailer/services/mailer.service';
import { superAdminStub } from 'src/user/__mocks__/user.stub';
import { CreateUserDto } from 'src/user/dto/create-user.dto';
import { UsersService } from 'src/user/services/users.service';
import { resetPasswordMessageStub } from '../__mocks__/auth.stub';
import { ForgotPasswordDto } from '../dto/forgot-password.dto';
import { LoginUserDto } from '../dto/login.dto';
import { ResetPasswordDto } from '../dto/reset-password.dto';
import { AuthService } from './auth.service';
import { UsersRepository } from 'src/user/repositories/users.repository';
import { TelegramService } from 'src/telegram/telegram.service';

jest.mock('src/common/helpers/hashing', () => ({
  verifyPassword: jest.fn(),
}));

describe('AuthService', () => {
  let originalDate = Date;

  let authService: AuthService;
  let jwtService: JwtService;
  let usersService: UsersService;
  let usersRepository: UsersRepository;
  let configService: ConfigService;
  let mailerService: MailerService;
  let telegramService: TelegramService;

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
        { provide: TelegramService, useValue: createMock<TelegramService>() },
      ],
    }).compile();

    authService = moduleRef.get<AuthService>(AuthService);
    jwtService = moduleRef.get<JwtService>(JwtService);
    usersService = moduleRef.get<UsersService>(UsersService);
    usersRepository = moduleRef.get<UsersRepository>(UsersRepository);
    configService = moduleRef.get<ConfigService>(ConfigService);
    mailerService = moduleRef.get<MailerService>(MailerService);
    telegramService = moduleRef.get<TelegramService>(TelegramService);
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
        .spyOn(telegramService, 'fetchTelegramUser')
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
      );
      expect(telegramService.fetchTelegramUser).toHaveBeenCalledWith(
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

    it('should throw UnauthorizedException for invalid credentials', async () => {
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
      jest.spyOn(telegramService, 'fetchTelegramUser').mockResolvedValue(null);
      (verifyPassword as jest.Mock).mockResolvedValue(false); // Mock password validation to fail

      await expect(authService.login(loginUserDto)).rejects.toThrow(
        UnauthorizedException,
      );

      expect(usersService.findUserByEmail).toHaveBeenCalledWith(
        loginUserDto.email,
        undefined,
      );
      expect(verifyPassword).toHaveBeenCalledWith(
        loginUserDto.password,
        user.password,
      );
      expect(telegramService.fetchTelegramUser).not.toHaveBeenCalled();
    });
  });

  describe('initiateRegistration', () => {
    it('should send a confirmation link on successful registration', async () => {
      const createUserDto: CreateUserDto = {
        email: 'test@gmail.com',
        password: 'password123',
      };

      jest.spyOn(usersService, 'doesUserExist').mockResolvedValue(false);
      jest.spyOn(jwtService, 'sign').mockReturnValue('mockToken');
      jest.spyOn(configService, 'get').mockReturnValue('http://localhost');
      jest
        .spyOn(mailerService, 'getLink')
        .mockReturnValue('http://localhost/auth/confirm/mockToken');

      const result = await authService.initiateRegistration(
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
      expect(mailerService.getLink).toHaveBeenCalledWith(
        'http://localhost',
        'auth/confirm/mockToken',
        'Confirm your email',
      );
      expect(mailerService.sendDistribution).toHaveBeenCalledWith(
        expect.any(String), // Sender
        createUserDto.email,
        expect.objectContaining({ subject: 'Confirm your email' }),
      );
      expect(result).toEqual({
        message: `Confirmation link sent to your email ${createUserDto.email}`,
        statusCode: HttpStatus.OK,
      });
    });

    it('should throw ConflictException if the user already exists', async () => {
      const createUserDto: CreateUserDto = {
        email: 'test@gmail.com',
        password: 'password123',
      };

      jest.spyOn(usersService, 'doesUserExist').mockResolvedValue(true);

      await expect(
        authService.initiateRegistration(createUserDto),
      ).rejects.toThrow(ConflictException);
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
      jest.spyOn(mailerService, 'sendResetPasswordLink').mockResolvedValue({
        message: `Password reset link sent to ${forgotPasswordDto.email}`,
        statusCode: HttpStatus.OK,
      });

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
      );
      expect(result).toEqual({
        message: `Password reset email sent on ${user.email}`,
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

      const result = await authService.resetPassword(
        token,
        resetPasswordDto,
        undefined,
      );

      expect(jwtService.verify).toHaveBeenCalledWith(token);
      expect(usersService.resetPassword).toHaveBeenCalledWith(
        superAdminStub().id,
        resetPasswordDto.newPassword,
        undefined,
      );
      expect(result).toEqual(resetPasswordMessageStub());
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
});
