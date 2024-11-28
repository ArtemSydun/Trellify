import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  HttpStatus,
} from '@nestjs/common';

import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { UserService } from '../services/user.service';
import { User } from '../entities/user.entity';
import { DefaultResponse } from 'src/common/interfaces/responses';
import { JwtAuthGuard } from 'src/auth/guards/jwt.guard';
import { ApiOkResponse } from '@nestjs/swagger';


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
  create(@Body() createUserDto: CreateUserDto): Promise<DefaultResponse<null>> {
    return this.userService.initiateUserRegistration(createUserDto);
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

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  updateUserById(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.userService.updateUserById(id, updateUserDto);
  }
}
