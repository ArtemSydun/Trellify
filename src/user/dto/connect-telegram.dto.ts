import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsInt, Validate } from 'class-validator';
import { IsNullOrEmptyString } from 'src/common/decorators/custom.validators';
export class ConnectTelegramDto {
    @ApiProperty({
        description: 'The Telegram chat ID associated with the user. Must be a valid number or null.',
        example: 1234567890,
        nullable: true,
        required: true,
    })
    @IsOptional()
    @IsInt({ message: 'chatId must be a valid number or null' })
    @Validate(IsNullOrEmptyString, { message: 'chatId cannot be an empty string' })
    chatId: number | null;

    @ApiProperty({
        description: 'The Telegram username of the user. Must be a string or null.',
        example: 'telegram_username',
        nullable: true,
        required: true,
    })
    @IsOptional()
    @Validate(IsNullOrEmptyString, { message: 'username cannot be an empty string' })
    username: string | null;
}
