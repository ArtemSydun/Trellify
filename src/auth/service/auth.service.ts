import {
  BadRequestException,
  ConflictException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { LoginUserDto } from '../dto/login.dto';
import { User } from 'src/user/entities/user.entity';
import { UsersService } from 'src/user/services/users.service';

import { configServiceEnum } from 'src/common/enums/config.service.enum';
import { ConfigService } from '@nestjs/config';

import { ResetPasswordDto } from '../dto/reset-password.dto';
import { DefaultResponse } from 'src/common/interfaces/responses';
import { verifyPassword } from 'src/common/helpers/hashing';
import { MailerService } from 'src/mailer/services/mailer.service';
import { ForgotPasswordDto } from '../dto/forgot-password.dto';
import { CreateUserDto } from 'src/user/dto/create-user.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly userService: UsersService,
    private readonly configService: ConfigService,
    private readonly mailService: MailerService,
  ) { }

  private verifyToken(token: string): any {
    try {
      const decoded = this.jwtService.verify(token);
      return decoded;
    } catch (err) {
      this.logger.error('Invalid or expired token', err.stack);
      throw new BadRequestException('Your token is not valid or expired');
    }
  }

  public async login(
    loginUserDto: LoginUserDto,
  ): Promise<{ accessToken: string; user: Partial<User> }> {
    const user = await this.userService.findUserByEmail(loginUserDto.email);

    const isCredentialsValid = await verifyPassword(
      loginUserDto.password,
      user.password,
    );
    if (!isCredentialsValid) {
      this.logger.warn(`Invalid credentials for email: ${loginUserDto.email}`);
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = { email: user.email, id: user.id, role: user.role };
    const token: string = this.jwtService.sign(payload);

    delete user.password;

    this.logger.log(`User logged in successfully: ${user.email}`);

    return {
      accessToken: token,
      user,
    };
  }

  public async initiateRegistration(createUserDto: CreateUserDto): Promise<DefaultResponse<null>> {
    this.logger.log(`Initiating user registration for email: ${createUserDto.email}`);

    const userByEmail = await this.userService.doesUserExist(createUserDto.email);
    if (userByEmail) {
      this.logger.warn(`User ${createUserDto.email} already exists`);
      throw new ConflictException(`User ${createUserDto.email} already exists`);
    }

    const payload = {
      email: createUserDto.email,
      password: createUserDto.password,
      telegram: { username: null, chatId: null },
      trello: { userId: null, token: null, webhooks: [] },
    };

    const token = this.jwtService.sign(payload, { expiresIn: '1d' });

    const confirmationLink = this.mailService.getLink(
      this.configService.get(configServiceEnum.FRONTEND_LINK),
      `auth/confirm/${token}`,
      'Confirm your email',
    );

    await this.mailService.sendDistribution(
      this.configService.get(configServiceEnum.MAILER_SENDER),
      createUserDto.email,
      {
        subject: 'Confirm Your Email',
        html: `<p>Please confirm your email by clicking the following link: ${confirmationLink}</p>`,
      },
    );

    this.logger.log(`Confirmation link sent to ${createUserDto.email}`);
    return {
      message: `Confirmation link sent to your email ${createUserDto.email}`,
      statusCode: HttpStatus.OK,
    };
  }

  public async confirmRegistration(
    token: string,
  ): Promise<DefaultResponse<null>> {

    const decoded = this.verifyToken(token);
    const { email, password, ...userData } = decoded;

    const newUser = {
      email,
      password,
      ...userData,
    };
    await this.userService.createUser(newUser);

    this.logger.log(`User registered successfully: ${email}`);
    return { message: 'User registered successfully', statusCode: HttpStatus.OK };

  }

  public async forgotPassword(
    forgotPasswordDto: ForgotPasswordDto,
  ): Promise<DefaultResponse<null>> {
    const user = await this.userService.findUserByEmail(forgotPasswordDto.email);
    const token: string = this.jwtService.sign(
      { id: user.id },
      {
        expiresIn: this.configService.get(configServiceEnum.JWT_EXPIRES_PASSWORD),
      },
    );

    await this.mailService.sendResetPasswordLink(user.email, token);

    this.logger.log(`Password reset email sent to: ${user.email}`);
    return {
      message: `Password reset email sent on ${user.email}`,
      statusCode: HttpStatus.OK,
    };
  }

  public async resetPassword(token: string, resetPasswordDto: ResetPasswordDto): Promise<DefaultResponse<null>> {
    const { newPassword, repeatPassword } = resetPasswordDto;

    if (newPassword !== repeatPassword) {
      this.logger.warn('Password mismatch during reset');
      throw new BadRequestException(`Password and repeat password does not match`);
    }

    const { id } = this.verifyToken(token);

    await this.userService.resetPassword(id, newPassword);

    this.logger.log(`Password successfully reset for user ID: ${id}`);

    return {
      message: 'Password changed successfully',
      statusCode: HttpStatus.OK,
    };
  }
}
