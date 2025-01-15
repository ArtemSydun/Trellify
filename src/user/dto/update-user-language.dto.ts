import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { Languages } from 'src/common/enums/languages.enum';

export class UpdateUserLanguageDto {
  @ApiProperty({
    description: 'User language preference',
    example: Languages.EN,
  })
  @IsEnum(Languages, {
    message: 'language must be a valid enum value',
  })
  language: Languages;
}
