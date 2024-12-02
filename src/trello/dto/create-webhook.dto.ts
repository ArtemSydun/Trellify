import { ApiProperty } from "@nestjs/swagger";

export class CreateWebhookDto {
    @ApiProperty({
        description: 'BoardId we are creating webhook for',
        example: '673ef22130ed24174d378374',
    })
    boardId: string;
}