import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEnum, IsNumber, IsOptional, Max, Min } from 'class-validator';
import { Languages } from 'src/common/enums/languages.enum';

export class UpdateUserPreferencesDto {
  @ApiProperty({
    description: 'User language preference',
    example: Languages.EN,
  })
  @IsOptional()
  @IsEnum(Languages, {
    message: 'language must be a valid enum value',
  })
  language?: Languages;

  @ApiProperty({
    description: 'User timezone (for example UTC -2)',
    example: -2,
  })
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsNumber()
  @Min(-12, { message: 'Timezone cannot be lower than UTC -12' })
  @Max(14, { message: 'Timezone cannot be higher than UTC +14' })
  timezone?: number;
}
