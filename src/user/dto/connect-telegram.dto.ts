import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional, Validate } from 'class-validator';
import { IsNullOrEmptyString } from 'src/common/decorators/custom.validators';

export class ConnectTelegramDto {
    @ApiProperty()
    @IsOptional()
    @IsInt({ message: 'chatId must be a valid number or null' })
    @Validate(IsNullOrEmptyString, { message: 'chatId cannot be an empty string' })
    chatId: number | null;

    @ApiProperty()
    @IsOptional()
    @Validate(IsNullOrEmptyString, { message: 'username cannot be an empty string' })
    username: string | null;
}
