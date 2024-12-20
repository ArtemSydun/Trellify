import { BadRequestException } from "@nestjs/common";

export function validateTrelloToken(token: string | undefined | null): void {
    if (!token) {
        throw new BadRequestException('Please check your Trello connection');
    }
    if (typeof token !== 'string' || token.trim() === '') {
        throw new BadRequestException('Trello token is invalid');
    }
}
