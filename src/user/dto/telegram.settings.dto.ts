import { Optional } from "@nestjs/common";
import { Prop } from "@nestjs/mongoose";
import { ApiProperty } from "@nestjs/swagger";

export class TelegramSettings {
    @ApiProperty({
        description: 'Telegram username of the user',
        example: 'john_doe | null',
        required: false,
        nullable: true,
    })
    @Optional()
    @Prop({ required: false })
    username?: string;

    @ApiProperty({
        description: 'Telegram chat ID of the user',
        example: 1234567890,
        required: false,
        nullable: true,
    })
    @Optional()
    @Prop({ required: false })
    chatId?: number;

    @ApiProperty({
        description: 'Timestamp of the last update to the Telegram settings',
        example: '2025-01-02T15:46:09.123Z',
        required: false,
    })
    @Prop({
        default: () => new Date(),
        required: false,
    })
    updatedAt?: Date
}