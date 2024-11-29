import {
  Controller,
  Post,
  Body,
  Patch,
  Param,
  UseGuards,
  HttpStatus,
} from '@nestjs/common';

import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { UserService } from '../services/user.service';
import { DefaultResponse } from 'src/common/interfaces/responses';
import { JwtAuthGuard } from 'src/auth/guards/jwt.guard';
import { ApiOkResponse } from '@nestjs/swagger';
import { ApiCustomConflictResponse, ApiCustomNotFoundResponse } from 'src/common/decorators/swagger.decorators';
import { User } from '../entities/user.entity';


@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) { }

  @Post()
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
    return this.userService.initiateUserRegistration(createUserDto);
  }


  
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
      },
    },
  })
  @ApiCustomNotFoundResponse('User', 'id')
  @UseGuards(JwtAuthGuard)
  updateUserById(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto): Promise<DefaultResponse<User>> {
    return this.userService.updateUserById(id, updateUserDto);
  }

  //should be admin only routes
  // @Get()
  // findAll(): Promise<User[]> {
  //   return this.userService.findAll();
  // }
  
  // @Get(':id')
  // findOne(@Param('id') id: string): Promise<User> {
  //   return this.userService.findUserById(id);
  // }
}
