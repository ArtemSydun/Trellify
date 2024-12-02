import { ApiProperty } from '@nestjs/swagger';
import { IBoard } from '../interfaces/board.interface';

export class Board implements IBoard {
    @ApiProperty({
        description: 'The unique ID of the board',
        example: '674436f3f82d54fda5206965',
    })
    id: string;

    @ApiProperty({
        description: 'The name of the board',
        example: '15151251',
    })
    name: string;

    @ApiProperty({
        description: 'The description of the board',
        example: 'description',
    })
    desc: string;

    @ApiProperty({
        description: 'Whether the board is closed or not',
        example: false,
    })
    closed: boolean;

    @ApiProperty({
        description: 'The date the board was closed (if applicable)',
        example: null,
    })
    dateClosed: string | null;

    @ApiProperty({
        description: 'Whether the board is pinned',
        example: false,
    })
    pinned: boolean;

    @ApiProperty({
        description: 'Whether the board is starred',
        example: false,
    })
    starred: boolean;

    @ApiProperty({
        description: 'The URL of the board',
        example: 'https://trello.com/b/S3vtv1ME/15151251',
    })
    url: string;

    @ApiProperty({
        description: 'The short link of the board',
        example: 'S3vtv1ME',
    })
    shortLink: string;

    @ApiProperty({
        description: 'Whether the user is subscribed to the board',
        example: false,
    })
    subscribed: boolean;

    @ApiProperty({
        description: 'The last activity date of the board',
        example: '2024-11-28T15:10:49.503Z',
    })
    dateLastActivity: string;

    @ApiProperty({
        description: 'The last view date of the board',
        example: '2024-12-02T08:01:38.170Z',
    })
    dateLastView: string;

    @ApiProperty({
        description: 'The short URL of the board',
        example: 'https://trello.com/b/S3vtv1ME',
    })
    shortUrl: string;

    @ApiProperty({
        description: 'The ID of the member who created the board',
        example: '673ef1f4c1d0247b538a4ac3',
    })
    idMemberCreator: string;
}
