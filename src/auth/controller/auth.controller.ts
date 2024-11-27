import { Body, Controller, Get, HttpStatus, Param, Post, Query } from '@nestjs/common';

import { AuthService } from '../service/auth.service';
import { LoginUserDto, LoginUserResponseDto } from '../dto/login.dto';
import { User } from 'src/user/entities/user.entity';
import { ForgotPasswordDto } from '../dto/forgotPassword.dto';
import { DefaultResponse } from 'src/common/interfaces/responses';
import { ApiOkResponse, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { ApiCustomConflictResponse, ApiCustomNotFoundResponse, ApiCustomUnathorizedResponse } from 'src/common/decorators/swagger.decorators';
import { Errors } from 'src/common/constants/enums';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  @ApiOkResponse({
    description: 'Successfully logged in',
    type: LoginUserResponseDto,
  })
  @ApiCustomNotFoundResponse('User', 'email')
  @ApiUnauthorizedResponse({
    description: 'Invalid credentials',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'Invalid credentials',
        },
        error: {
          type: 'string',
          example: Errors.UNATHORIZED,
        },
        statusCode: {
          type: 'number',
          example: HttpStatus.UNAUTHORIZED,
        },
      },
    },
  })
  @Post('login')
  login(
    @Body() loginCredentials: LoginUserDto,
  ): Promise<{ accessToken: string; user: Partial<User> }> {
    return this.authService.login(loginCredentials);
  }

  @ApiOkResponse({
    description: 'Password reset email sent successfully',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'Password reset email sent on user@mail.com',  
        },
        statusCode: {
          type: 'number',
          example: HttpStatus.OK,
        },
      },
    },
  })
  @ApiCustomNotFoundResponse('User', 'email')
  @Post('forgot-password')
  public forgotPassword(
    @Body() forgotPasswordDto: ForgotPasswordDto,
  ): Promise<DefaultResponse<null>> {
    return this.authService.forgotPassword(forgotPasswordDto);
  }

  @ApiOkResponse({
    description: 'Password changed successfully',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'Password changed successfully',  
        },
        statusCode: {
          type: 'number',
          example: HttpStatus.OK,
        },
        data: {
          type: 'string',
          example: 'Your new password: {newPassword}'
        }
      },
    },
  })
  @ApiCustomNotFoundResponse('User', 'id')
  @Get('reset-password/:token')
  public resetPassword(
    @Param('token') token: string,
  ): Promise<DefaultResponse<string>> {
    return this.authService.resetPassword(token);
  }

  @ApiOkResponse({
    description: 'User registered successfully',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'User registered successfully',  
        },
        statusCode: {
          type: 'number',
          example: HttpStatus.OK,
        },
      },
    },
  })
  @ApiCustomConflictResponse('User', 'email')
  @Get('confirm')
  async confirmRegistration(@Query('token') token: string): Promise<DefaultResponse<null>> {
    return this.authService.confirmRegistration(token);
  }
}
