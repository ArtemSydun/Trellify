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
  Query,
  Delete,
} from '@nestjs/common';

import { UpdateUserDto } from '../dto/update-user.dto';
import { UsersService } from '../services/users.service';
import { DefaultResponse } from 'src/common/interfaces/responses';
import { JwtAuthGuard } from 'src/auth/guards/jwt.guard';
import { ApiOkResponse, getSchemaPath } from '@nestjs/swagger';
import { ApiCustomForbiddenResponse, ApiCustomNotFoundResponse, ApiCustomUnathorizedResponse } from 'src/common/decorators/swagger.decorators';
import { User } from '../entities/user.entity';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/common/decorators/auth.role.decorator';
import { UserRoles } from '../interfaces/role.enum';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) { }

  //should be admin only routes
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRoles.admin, UserRoles.superadmin)
  @Get()
  @ApiOkResponse({
    description: 'All users list',
    type: [User]
  })
  @ApiCustomUnathorizedResponse()
  @ApiCustomForbiddenResponse()
  findAll(): Promise<User[]> {
    return this.usersService.findAll();
  }

  @UseGuards(JwtAuthGuard)
  @ApiOkResponse({
    description: 'Telegram connected successfully',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'Telegram {{username}} connected successfully',
        },
        statusCode: {
          type: 'number',
          example: HttpStatus.OK
        },
        data: {
          type: 'object',
          $ref: getSchemaPath(User),
        },
      },
    },
  })

  @Get('telegram')
  @ApiCustomUnathorizedResponse()
  @ApiCustomNotFoundResponse('User', 'id')
  handleTelegramQuery(
    @Req() req,
    @Query('chatId') chatId: string,
    @Query('username') username: string,
  ) {
    return this.usersService.connectUserTelegram(req.user.userId, parseInt(chatId), username);
  }


  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRoles.admin, UserRoles.superadmin)
  @Get(':id')
  @ApiOkResponse({
    description: 'User by id',
    type: User
  })
  @ApiCustomUnathorizedResponse()
  @ApiCustomForbiddenResponse()
  @ApiCustomNotFoundResponse('User', 'id')
  findOne(@Param('id') id: string): Promise<User> {
    return this.usersService.findUserById(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRoles.superadmin)
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
          example: HttpStatus.OK
        },
      },
    },
  })
  @ApiCustomForbiddenResponse()
  @ApiCustomUnathorizedResponse()
  @ApiCustomNotFoundResponse('User', 'id')
  @Delete(':id')
  deleteUserById(@Param('id') id: string): Promise<DefaultResponse<string>> {
    return this.usersService.deleteUserById(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRoles.superadmin)
  @Get('/profile')
  @ApiOkResponse({
    description: 'User profile',
    type: [User]
  })
  @ApiCustomUnathorizedResponse()
  @ApiCustomNotFoundResponse('User', 'id')
  getUserProfile(@Req() req): Promise<User> {
    return this.usersService.findUserProfile(req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
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
          example: HttpStatus.OK
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
  updateUserById(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto, @Req() req): Promise<DefaultResponse<User>> {
    return this.usersService.updateUserById(id, updateUserDto, req.user);
  }
}
