import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, Length, MinLength, Validate } from 'class-validator';
import { IsNullOrEmptyString } from 'src/common/decorators/custom.validators';

export class ConnectTrelloDto {
    @ApiProperty()
    @IsOptional()
    @Validate(IsNullOrEmptyString, { message: 'token should be null or 76 length string' })
    @Length(76,76)
    token: string | null;
}
