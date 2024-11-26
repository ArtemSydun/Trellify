import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';

import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { UserService } from '../services/user.service';
import { User } from '../entities/user.entity';
import { DefaultResponse } from 'src/common/interfaces/responses';
import { JwtAuthGuard } from 'src/auth/guards/jwt.guard';


@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  create(@Body() createUserDto: CreateUserDto): Promise<DefaultResponse<null>> {
    return this.userService.initiateUserRegistration(createUserDto);
  }

  @Get()
  findAll(): Promise<User[]> {
    return this.userService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<User> {
    return this.userService.findUserById(id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  updateUserById(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.userService.updateUserById(id, updateUserDto);
  }
}
