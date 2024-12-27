import { Controller, Post, HttpStatus, Body, Param, Get } from "@nestjs/common";
import { ApiOperation, ApiOkResponse, ApiUnauthorizedResponse } from "@nestjs/swagger";
import { ApiCustomNotFoundResponse, ApiCustomConflictResponse, ApiCustomUnathorizedResponse, ApiCustomBadRequestResponse } from "src/common/decorators/swagger.decorators";
import { Errors } from "src/common/enums/errors.enum";
import { DefaultResponse } from "src/common/interfaces/responses";
import { CreateUserDto } from "src/user/dto/create-user.dto";
import { User } from "src/user/entities/user.entity";
import { ForgotPasswordDto } from "../dto/forgot-password.dto";
import { LoginUserResponseDto, LoginUserDto } from "../dto/login.dto";
import { ResetPasswordDto } from "../dto/reset-password.dto";
import { AuthService } from "../services/auth.service";


@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService,
  ) { }

  @Post('login')
  @ApiOperation({
    summary: 'Login with user credentials',
    description: 'Logs in the user with their credentials and returns an access token and user data.',
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
  ): Promise<{ accessToken: string; user: Partial<User> }> {
    return this.authService.login(loginCredentials);
  }

  @Post('sign-up')
  @ApiOperation({
    summary: 'Sign up a new user',
    description: 'Registers a new user and sends a confirmation email with a link to verify the account.',
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
          example: HttpStatus.OK
        },
      },
    },
  })
  @ApiCustomConflictResponse('User', 'email')
  create(@Body() createUserDto: CreateUserDto): Promise<DefaultResponse<null>> {
    return this.authService.initiateRegistration(createUserDto);
  }

  @Post('forgot-password')
  @ApiOperation({
    summary: 'Request password reset',
    description: 'Sends a password reset email to the user with a link to reset their password.',
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
  ): Promise<DefaultResponse<null>> {
    return this.authService.forgotPassword(forgotPasswordDto);
  }

  @Post('reset-password/:token')
  @ApiOperation({
    summary: 'Reset user password',
    description: 'Resets the user password based on the provided reset token and new password.',
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
  @ApiCustomBadRequestResponse('Invalid token', 'Your token is not valid or expired')
  public resetPassword(
    @Param('token') token: string,
    @Body() resetPasswordDto: ResetPasswordDto
  ): Promise<DefaultResponse<null>> {
    return this.authService.resetPassword(token, resetPasswordDto);
  }

  @Get('confirm/:token')
  @ApiOperation({
    summary: 'Confirm user registration',
    description: 'Confirms the user’s email address by verifying the confirmation token.',
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
  async confirmRegistration(@Param('token') token: string): Promise<DefaultResponse<null>> {
    return this.authService.confirmRegistration(token);
  }
}
