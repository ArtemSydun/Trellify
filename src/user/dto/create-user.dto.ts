import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, Max, Min } from 'class-validator';

export class CreateUserDto {
  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiProperty()
  @IsString()
  password: string;
}
