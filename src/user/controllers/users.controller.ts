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
} from '@nestjs/common';

import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiOkResponse,
  ApiOperation,
  getSchemaPath,
} from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { I18n, I18nContext } from 'nestjs-i18n';
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
import { DefaultResponse } from 'src/common/interfaces/responses';
import { ConnectTelegramDto } from '../dto/connect-telegram.dto';
import { ConnectTrelloDto } from '../dto/connect-trello.dto';
import { UpdateUserLanguageDto } from '../dto/update-user-language.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
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
  @ApiOkResponse({
    description: 'All users list',
    type: [User],
  })
  @ApiCustomUnathorizedResponse()
  @ApiCustomForbiddenResponse()
  findAll(): Promise<User[]> {
    return this.usersService.findAll();
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
  handleTrelloQuery(
    @Req() req,
    @Body() connectTrelloDto: ConnectTrelloDto,
    @I18n() i18n: I18nContext,
  ) {
    return this.usersService.manageUserTrelloConnection(
      req.user.id,
      connectTrelloDto,
      i18n,
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
    return this.usersService.findUserProfile(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('language')
  @ApiOperation({
    summary: 'Update a user language preference',
    description: 'This endpoint allows to update user language preference.',
  })
  @ApiOkResponse({
    description: 'User language preference updated successfully',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'User {{id}} language preference updated successfully',
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
  updateUserLanguagePreference(
    @Req() req,
    @Body() updateUserLangueageDto: UpdateUserLanguageDto,
    @I18n() i18n: I18nContext,
  ): Promise<DefaultResponse<User>> {
    return this.usersService.updateUserLanguagePreference(
      req.user,
      updateUserLangueageDto,
      i18n,
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
    summary: 'Delete a user by ID (Superadmin only)',
    description:
      'This endpoint allows to delete a user by their ID. It can only be accessed by users with the superadmin role.',
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
