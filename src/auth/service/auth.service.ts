import {
  ConflictException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { LoginUserDto } from '../dto/login.dto';
import { User } from 'src/user/entities/user.entity';
import { UserService } from 'src/user/services/user.service';

import { configServiceEnum } from 'src/common/enums/config.service.enum';
import { ConfigService } from '@nestjs/config';

import { ForgotPasswordDto } from '../dto/forgotPassword.dto';
import { DefaultResponse } from 'src/common/interfaces/responses';
import { verifyPassword, generateRandomPassword } from 'src/common/helpers/hashing';
import { MailerService } from 'src/mailer/services/mailer.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly userService: UserService,
    private readonly configService: ConfigService,
    private readonly mailService: MailerService,
  ) { }

  public async login(
    loginUserDto: LoginUserDto,
  ): Promise<{ accessToken: string; user: Partial<User> }> {
    const user = await this.userService.findUserByEmail(loginUserDto.email);

    if (!user) {
      throw new UnauthorizedException(
        `User ${loginUserDto.email} does not exist`,
      );
    }
    const isCredentialsValid = await verifyPassword(
      loginUserDto.password,
      user.password,
    );
    if (!isCredentialsValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = { email: user.email, sub: user.id };

    const token: string = this.jwtService.sign(payload);

    delete user.password;

    return {
      accessToken: token,
      user,
    };
  }

  public async confirmRegistration(
    token: string,
  ): Promise<DefaultResponse<null>> {
    const decoded = this.jwtService.verify(token);

    const { email, password, ...userData } = decoded;

    const doesUserExist = await this.userService.doesUserExist(email);

    if (doesUserExist) {
      throw new ConflictException(`User ${email} already exists`);
    }

    const newUser = {
      email,
      password,
      ...userData,
    };
    await this.userService.createUser(newUser);

    return { message: 'User registered successfully', statusCode: HttpStatus.OK };
  }

  public async forgotPassword(
    forgotPasswordDto: ForgotPasswordDto,
  ): Promise<DefaultResponse<null>> {
    const user = await this.userService.findUserByEmail(
      forgotPasswordDto.email,
    );
    const token: string = this.jwtService.sign(
      { id: user.id },
      {
        expiresIn: this.configService.get(configServiceEnum.JWT_EXPIRES_IN),
      },
    );

    await this.mailService.sendResetPasswordLink(user.email, token);

    return {
      message: 'Password reset email sent',
      statusCode: HttpStatus.OK,
    };
  }

  public async resetPassword(token: string): Promise<DefaultResponse<string>> {
    try {
      const { id } = this.jwtService.verify(token);
      const newPassword = generateRandomPassword();
      await this.userService.resetPassword(id, newPassword);

      return {
        message: 'Password changed successfully',
        statusCode: HttpStatus.OK,
        data: `Your new password [${newPassword}]`,
      };
    } catch (err) {
      throw err;
    }
  }
}
