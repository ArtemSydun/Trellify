import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';

import { AuthService } from '../service/auth.service';
import { LoginUserDto } from '../dto/login.dto';
import { User } from 'src/user/entities/user.entity';
import { ForgotPasswordDto } from '../dto/forgotPassword.dto';
import { DefaultResponse } from 'src/common/interfaces/responses';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  login(
    @Body() loginCredentials: LoginUserDto,
  ): Promise<{ accessToken: string; user: Partial<User> }> {
    return this.authService.login(loginCredentials);
  }

  @Post('forgot-password')
  public forgotPassword(
    @Body() forgotPasswordDto: ForgotPasswordDto,
  ): Promise<DefaultResponse<null>> {
    return this.authService.forgotPassword(forgotPasswordDto);
  }

  @Get('reset-password/:token')
  public resetPassword(
    @Param('token') token: string,
  ): Promise<DefaultResponse<null>> {
    return this.authService.resetPassword(token);
  }

  @Get('confirm')
  async confirmRegistration(@Query('token') token: string) {
    return this.authService.confirmRegistration(token);
  }
}
