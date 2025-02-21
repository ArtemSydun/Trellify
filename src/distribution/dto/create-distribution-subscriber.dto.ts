import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsOptional, IsString } from 'class-validator';
import { Languages } from 'src/common/enums/languages.enum';

export class CreateDistributionSubscriberDto {
  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiProperty()
  @IsEnum(Languages)
  language: Languages;

  @ApiProperty()
  @IsOptional()
  @IsString()
  trellifyUserId?: string | null;
}
