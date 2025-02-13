import {
  Controller,
  Post,
  Body,
  Patch,
  Param,
  UseGuards,
  HttpStatus,
  Req,
  Get,
  Delete,
  Query,
} from '@nestjs/common';

import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  getSchemaPath,
} from '@nestjs/swagger';
import { SkipThrottle, Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from 'src/auth/guards/jwt.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/common/decorators/auth.role.decorator';
import {
  ApiCustomBadRequestResponse,
  ApiCustomForbiddenResponse,
  ApiCustomNotFoundResponse,
  ApiCustomUnathorizedResponse,
} from 'src/common/decorators/swagger.decorators';
import { Errors } from 'src/common/enums/errors.enum';
import { Languages } from 'src/common/enums/languages.enum';
import {
  DefaultPaginatedResponse,
  DefaultResponse,
} from 'src/common/interfaces/responses';
import { ConnectTelegramDto } from '../dto/connect-telegram.dto';
import { ConnectTrelloDto } from '../dto/connect-trello.dto';
import { ContactUsDto } from '../dto/contact-us.dto';
import { UpdateUserPreferencesDto } from '../dto/update-user-preferences.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { UserQuery } from '../dto/user.query.dto';
import { UserWebhookDto } from '../dto/user.webhook.dto';
import { User } from '../entities/user.entity';
import { UserRoles } from '../enums/role.enum';
import { UsersService } from '../services/users.service';

@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRoles.admin, UserRoles.superadmin)
  @Get()
  @ApiOperation({
    summary: 'Get all users (Admin / Superadmin only)',
    description:
      'This endpoint retrieves a list of all users in the system. It can only be accessed by users with the admin or superadmin role.',
  })
  @ApiQuery({
    name: 'email',
    required: false,
    description: 'Filter by email (case-insensitive)',
  })
  @ApiQuery({
    name: 'role',
    required: false,
    enum: UserRoles,
    description: 'Filter by user role',
  })
  @ApiQuery({
    name: 'lastLoginDate',
    required: false,
    description: 'Filter by last login date (ISO format)',
  })
  @ApiQuery({
    name: 'lastActivityDate',
    required: false,
    description: 'Filter by last activity date (ISO format)',
  })
  @ApiQuery({
    name: 'trelloUserId',
    required: false,
    description: 'Filter by Trello user ID',
  })
  @ApiQuery({
    name: 'trelloUserName',
    required: false,
    description: 'Filter by Trello username',
  })
  @ApiQuery({
    name: 'telegramChatId',
    required: false,
    description: 'Filter by Telegram Chat ID',
  })
  @ApiQuery({
    name: 'telegramUserName',
    required: false,
    description: 'Filter by Telegram username',
  })
  @ApiQuery({
    name: 'language',
    required: false,
    enum: Languages,
    description: 'Filter by user language',
  })
  @ApiQuery({
    name: 'date',
    required: false,
    description: 'Date field to filter by (e.g., createdAt, lastLoginDate)',
  })
  @ApiQuery({
    name: 'fromDate',
    required: false,
    description: 'Start of date range (ISO format)',
  })
  @ApiQuery({
    name: 'toDate',
    required: false,
    description: 'End of date range (ISO format)',
  })
  @ApiQuery({
    name: 'order',
    required: false,
    enum: ['asc', 'desc'],
    description: 'Sorting order (asc or desc)',
  })
  @ApiQuery({
    name: 'orderBy',
    required: false,
    description: 'Field to order results by (default: createdAt)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of items per page (default: 10)',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (default: 1)',
  })
  @ApiOkResponse({
    description: 'All users list',
    type: [User],
  })
  @ApiCustomUnathorizedResponse()
  @ApiCustomForbiddenResponse()
  async findAll(
    @Query() queryParams: UserQuery,
  ): Promise<DefaultPaginatedResponse<User>> {
    return this.usersService.findAll(queryParams);
  }

  // 1 email per minute
  @Throttle({
    default: {
      limit: 1,
      ttl: 60 * 1000,
    },
  })
  @ApiOperation({
    summary: 'Contact us route for user emails',
    description: 'This endpoint sends a contact us form message.',
  })
  @ApiOkResponse({
    description: 'Contact us',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example:
            'Your message were sent to Trellify team. We will send you a response in 12-48 hours',
        },
        statusCode: {
          type: 'number',
          example: HttpStatus.OK,
        },
      },
    },
  })
  @Post('contact-us')
  async contactUs(
    @Body() formBody: ContactUsDto,
    @Req() req,
  ): Promise<DefaultResponse<null>> {
    return await this.usersService.contactUs(formBody, req.i18nContext);
  }

  @UseGuards(JwtAuthGuard)
  @Post('telegram')
  @ApiOperation({
    summary: 'Connect / Disconnect Telegram',
    description:
      'This endpoint handles connecting or disconnecting a Telegram account to the current user. It does not require special roles, but the user must be authenticated.',
  })
  @ApiOkResponse({
    description: 'Telegram connected / disconnected successfully',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example:
            'Telegram {{username}} connected / disconnected successfully',
        },
        statusCode: {
          type: 'number',
          example: HttpStatus.OK,
        },
        data: {
          type: 'object',
          $ref: getSchemaPath(User),
        },
      },
    },
  })
  @ApiCustomUnathorizedResponse()
  @ApiCustomNotFoundResponse('User', 'id')
  @ApiCustomBadRequestResponse(
    'Invalid tg info',
    'This telegram user has not interacted with bot yet',
  )
  @ApiConflictResponse({
    description: 'Telegram is already connected',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'Telegram notifier bot is already connected',
        },
        error: {
          type: 'string',
          example: Errors.CONFLICT,
        },
        statusCode: {
          type: 'number',
          example: HttpStatus.CONFLICT,
        },
      },
    },
  })
  handleTelegramQuery(
    @Req() req,
    @Body() connectTelegramDto: ConnectTelegramDto,
  ) {
    return this.usersService.manageUserTelegramConnection(
      req.user.id,
      connectTelegramDto,
      req.i18nContext,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post('trello')
  @ApiOperation({
    summary: 'Connect / Disconnect Trello',
    description:
      'This endpoint handles connecting or disconnecting a Trello account to the current user. It does not require special roles, but the user must be authenticated.',
  })
  @ApiOkResponse({
    description: 'Trello {{username}} connected / disconnected successfully',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'Trello {{username}} connected / disconnected successfully',
        },
        statusCode: {
          type: 'number',
          example: HttpStatus.OK,
        },
        data: {
          type: 'object',
          $ref: getSchemaPath(User),
        },
      },
    },
  })
  @ApiCustomUnathorizedResponse()
  @ApiCustomNotFoundResponse('User', 'id')
  @ApiCustomBadRequestResponse(
    'Invalid trello token',
    'Please provide us token with valid expiration date',
  )
  handleTrelloQuery(@Req() req, @Body() connectTrelloDto: ConnectTrelloDto) {
    return this.usersService.manageUserTrelloConnection(
      req.user.id,
      connectTrelloDto,
      req.i18nContext,
    );
  }

  @SkipThrottle()
  @UseGuards(JwtAuthGuard)
  @Get('profile')
  @ApiOperation({
    summary: 'Get user profile',
    description:
      'This endpoint retrieves the profile of the currently authenticated user.',
  })
  @ApiOkResponse({
    description: 'User profile',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', example: '123e4567-e89b-12d3-a456-426614174000' },
        email: { type: 'string', example: 'john.doe@example.com' },
        role: {
          type: 'string',
          enum: Object.values(UserRoles),
          example: UserRoles.user,
        },
        trello: {
          type: 'object',
          properties: {
            userId: { type: 'string', example: 'TrelloUser123 | null' },
            username: { type: 'string', example: 'TrelloUsername | null' },
            webhooks: {
              type: 'array',
              items: {
                $ref: getSchemaPath(UserWebhookDto),
              },
              example: [
                {
                  webhookId: 'Webhook123',
                  idModel: 'Model123',
                  modelName: 'Board',
                },
              ],
            },
          },
        },
        telegram: {
          type: 'object',
          properties: {
            username: { type: 'string', example: 'john_doe | null' },
          },
        },
      },
    },
  })
  @ApiCustomUnathorizedResponse()
  @ApiCustomNotFoundResponse('User', 'id')
  getUserProfile(@Req() req): Promise<Partial<User>> {
    return this.usersService.findUserProfile(req.user.id, req.i18nContext);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('preferences')
  @ApiOperation({
    summary: 'Update a user preferences (language, timezone)',
    description:
      'This endpoint allows to update user locale preferences (language, timezone).',
  })
  @ApiOkResponse({
    description: 'User preferences updated successfully',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'User {{id}} preferences updated successfully',
        },
        statusCode: {
          type: 'number',
          example: HttpStatus.OK,
        },
        data: {
          type: 'object',
          $ref: getSchemaPath(User),
        },
      },
    },
  })
  @ApiCustomUnathorizedResponse()
  @ApiCustomNotFoundResponse('User', 'id')
  updateUserPreferences(
    @Req() req,
    @Body() updateUserPreferencesDto: UpdateUserPreferencesDto,
  ): Promise<DefaultResponse<User>> {
    return this.usersService.updateUserPreferences(
      req.user,
      updateUserPreferencesDto,
      req.i18nContext,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRoles.admin, UserRoles.superadmin)
  @Get(':id')
  @ApiOperation({
    summary: 'Get a user by ID (Admin / Superadmin only)',
    description:
      'This endpoint retrieves the details of a specific user by their ID. It can only be accessed by users with the admin or superadmin role.',
  })
  @ApiOkResponse({
    description: 'User by id',
    type: User,
  })
  @ApiCustomUnathorizedResponse()
  @ApiCustomForbiddenResponse()
  @ApiCustomNotFoundResponse('User', 'id')
  findOne(@Param('id') id: string, @Req() req): Promise<User> {
    return this.usersService.findUserById(id, req.i18nContext);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  @ApiOperation({
    summary: 'Delete a user by ID.',
    description: 'This endpoint allows to delete a user by their ID.',
  })
  @ApiOkResponse({
    description: 'User deleted successfully',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'User {{id}} deleted successfully',
        },
        statusCode: {
          type: 'number',
          example: HttpStatus.OK,
        },
      },
    },
  })
  @ApiCustomUnathorizedResponse()
  @ApiCustomForbiddenResponse()
  @ApiCustomNotFoundResponse('User', 'id')
  deleteUserById(
    @Param('id') id: string,
    @Req() req,
  ): Promise<DefaultResponse<string>> {
    return this.usersService.deleteUserById(req.user.id, id, req.i18nContext);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRoles.superadmin)
  @Patch(':id')
  @ApiOperation({
    summary: 'Update a user by ID (Superadmin only)',
    description:
      'This endpoint allows to update a user by their ID. It can only be accessed by users with the superadmin role.',
  })
  @ApiOkResponse({
    description: 'User updated successfully',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'User {{id}} updated successfully',
        },
        statusCode: {
          type: 'number',
          example: HttpStatus.OK,
        },
        data: {
          type: 'object',
          $ref: getSchemaPath(User),
        },
      },
    },
  })
  @ApiCustomUnathorizedResponse()
  @ApiCustomForbiddenResponse()
  @ApiCustomNotFoundResponse('User', 'id')
  updateUserById(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
    @Req() req,
  ): Promise<DefaultResponse<User>> {
    return this.usersService.updateUser(
      id,
      updateUserDto,
      req.i18nContext,
      req.user,
    );
  }
}
