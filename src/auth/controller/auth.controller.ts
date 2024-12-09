import { Body, Controller, Get, HttpStatus, Param, Post, Query } from '@nestjs/common';

import { AuthService } from '../service/auth.service';
import { LoginUserDto, LoginUserResponseDto } from '../dto/login.dto';
import { User } from 'src/user/entities/user.entity';
import { ForgotPasswordDto } from '../dto/forgotPassword.dto';
import { DefaultResponse } from 'src/common/interfaces/responses';
import { ApiOkResponse, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { ApiCustomConflictResponse, ApiCustomNotFoundResponse, ApiCustomUnathorizedResponse } from 'src/common/decorators/swagger.decorators';
import { Errors } from 'src/common/enums/errors.enum';
import { CreateUserDto } from 'src/user/dto/create-user.dto';
import { UsersService } from 'src/user/services/users.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService,
    private readonly usersService: UsersService
  ) { }

  @Post('login')
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
  login(
    @Body() loginCredentials: LoginUserDto,
  ): Promise<{ accessToken: string; user: Partial<User> }> {
    return this.authService.login(loginCredentials);
  }

  @Post('sign-up')
  @ApiOkResponse({
    description: 'Confirmation link sent',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'Confirmation link sent to your email mail@mail.com',
        },
        statusCode: {
          type: 'number',
          example: HttpStatus.OK
        },
      },
    },
  })
  @ApiCustomConflictResponse('User', 'email')
  create(@Body() createUserDto: CreateUserDto): Promise<DefaultResponse<null>> {
    return this.usersService.initiateUserRegistration(createUserDto);
  }

  @Post('forgot-password')
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
  public forgotPassword(
    @Body() forgotPasswordDto: ForgotPasswordDto,
  ): Promise<DefaultResponse<null>> {
    return this.authService.forgotPassword(forgotPasswordDto);
  }

  @Get('reset-password/:token')
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
  public resetPassword(
    @Param('token') token: string,
  ): Promise<DefaultResponse<string>> {
    return this.authService.resetPassword(token);
  }

  @Get('confirm/:token')
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
  async confirmRegistration(@Param('token') token: string): Promise<DefaultResponse<null>> {
    return this.authService.confirmRegistration(token);
  }
}
