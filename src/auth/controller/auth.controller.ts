import {
  Controller,
  Post,
  HttpStatus,
  Body,
  Param,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiOkResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import {
  ApiCustomNotFoundResponse,
  ApiCustomConflictResponse,
  ApiCustomUnathorizedResponse,
  ApiCustomBadRequestResponse,
} from 'src/common/decorators/swagger.decorators';
import { Errors } from 'src/common/enums/errors.enum';
import { DefaultResponse } from 'src/common/interfaces/responses';
import { ChangeEmailDto } from 'src/user/dto/change-email.dto';
import { ChangePasswordDto } from 'src/user/dto/change-password.dto';
import { CreateUserDto } from 'src/user/dto/create-user.dto';
import { User } from 'src/user/entities/user.entity';
import { ForgotPasswordDto } from '../dto/forgot-password.dto';
import { LoginUserResponseDto, LoginUserDto } from '../dto/login.dto';
import { ResetPasswordDto } from '../dto/reset-password.dto';
import { JwtAuthGuard } from '../guards/jwt.guard';
import { AuthService } from '../services/auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @ApiOperation({
    summary: 'Login with user credentials',
    description:
      'Logs in the user with their credentials and returns an access token and user data.',
  })
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
    @Req() req,
  ): Promise<{ accessToken: string; user: Partial<User> }> {
    return this.authService.login(loginCredentials, req.i18nContext);
  }

  @Post('sign-up')
  @ApiOperation({
    summary: 'Sign up a new user',
    description:
      'Registers a new user and sends a confirmation email with a link to verify the account.',
  })
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
          example: HttpStatus.OK,
        },
      },
    },
  })
  @ApiCustomConflictResponse('User', 'email')
  create(
    @Body() createUserDto: CreateUserDto,
    @Req() req,
  ): Promise<DefaultResponse<null>> {
    return this.authService.initiateRegistration(
      createUserDto,
      req.i18nContext,
    );
  }

  @Post('sign-up/:token')
  @ApiOperation({
    summary: 'Confirm user registration',
    description:
      'Confirms the user’s email address by verifying the confirmation token.',
  })
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
  async confirmRegistration(
    @Param('token') token: string,
    @Req() req,
  ): Promise<DefaultResponse<null>> {
    return this.authService.confirmRegistration(token, req.i18nContext);
  }

  @Post('forgot-password')
  @ApiOperation({
    summary: 'Request password reset',
    description:
      'Sends a password reset email to the user with a link to reset their password.',
  })
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
    @Req() req,
  ): Promise<DefaultResponse<null>> {
    return this.authService.forgotPassword(forgotPasswordDto, req.i18nContext);
  }

  @Post('reset-password/:token')
  @ApiOperation({
    summary: 'Reset user password',
    description:
      'Resets the user password based on the provided reset token and new password.',
  })
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
      },
    },
  })
  @ApiCustomNotFoundResponse('User', 'id')
  @ApiCustomUnathorizedResponse()
  @ApiCustomBadRequestResponse(
    'Invalid token',
    'Your token is not valid or expired',
  )
  public resetPassword(
    @Param('token') token: string,
    @Body() resetPasswordDto: ResetPasswordDto,
    @Req() req,
  ): Promise<DefaultResponse<null>> {
    return this.authService.resetPassword(
      token,
      resetPasswordDto,
      req.i18nContext,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post('change-email')
  @ApiOperation({
    summary: 'Change email.',
    description: 'This endpoint allows users to change their email.',
  })
  @ApiOkResponse({
    description: 'Email change success',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'Email successfully changed',
        },
        statusCode: {
          type: 'number',
          example: HttpStatus.OK,
        },
      },
    },
  })
  @ApiCustomUnathorizedResponse()
  @ApiCustomNotFoundResponse('User', 'id')
  changeUserEmail(
    @Req() req,
    @Body() changeEmailDto: ChangeEmailDto,
  ): Promise<DefaultResponse<null>> {
    return this.authService.initiateChangeUserEmail(
      req.user.id,
      changeEmailDto,
      req.i18nContext,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post('change-email/:token')
  @ApiOperation({
    summary: 'Change email.',
    description: 'This endpoint allows users to change their email.',
  })
  @ApiOkResponse({
    description: 'Email change success',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'Email successfully changed',
        },
        statusCode: {
          type: 'number',
          example: HttpStatus.OK,
        },
      },
    },
  })
  @ApiCustomUnathorizedResponse()
  @ApiCustomNotFoundResponse('User', 'id')
  confirmChangeUserEmail(
    @Req() req,
    @Param('token') token: string,
  ): Promise<DefaultResponse<null>> {
    return this.authService.confirmChangeUserEmail(token, req.i18nContext);
  }

  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  @ApiOperation({
    summary: 'Change password.',
    description: 'This endpoint allows users to change their password.',
  })
  @ApiOkResponse({
    description: 'Password changed success',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'Password successfully changed',
        },
        statusCode: {
          type: 'number',
          example: HttpStatus.OK,
        },
      },
    },
  })
  @ApiCustomUnathorizedResponse()
  @ApiCustomNotFoundResponse('User', 'id')
  changeUserPassword(
    @Req() req,
    @Body() changePasswordDto: ChangePasswordDto,
  ): Promise<DefaultResponse<null>> {
    return this.authService.changeUserPassword(
      req.user.id,
      changePasswordDto,
      req.i18nContext,
    );
  }
}
