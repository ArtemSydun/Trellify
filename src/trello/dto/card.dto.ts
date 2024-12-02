import { ApiProperty } from '@nestjs/swagger';

export class BadgesDto {
    @ApiProperty({
        description: 'External source associated with the card, if any',
        example: null,
    })
    externalSource: null | string;

    @ApiProperty({
        description: 'Whether the card is subscribed by the user',
        example: true,
    })
    subscribed: boolean;

    @ApiProperty({
        description: 'Number of attachments associated with the card',
        example: 0,
    })
    attachments: number;

    @ApiProperty({
        description: 'Number of check items on the card',
        example: 0,
    })
    checkItems: number;

    @ApiProperty({
        description: 'Number of check items that have been checked',
        example: 0,
    })
    checkItemsChecked: number;

    @ApiProperty({
        description: 'Number of comments on the card',
        example: 1,
    })
    comments: number;

    @ApiProperty({
        description: 'Whether the card has a description',
        example: false,
    })
    description: boolean;

    @ApiProperty({
        description: 'Due date of the card',
        example: '2024-12-03T09:08:27.866Z',
    })
    due: string;

    @ApiProperty({
        description: 'Whether the card is marked as complete or not',
        example: false,
    })
    dueComplete: boolean;

    @ApiProperty({
        description: 'Start date of the card',
        example: '2024-12-02T06:00:27.866Z',
    })
    start: string;
}

export class TrelloCard {
    @ApiProperty({
        description: 'The unique identifier for the card',
        example: '6745bd3c7a183b24eba77188',
    })
    id: string;

    @ApiProperty({
        description: 'The badges associated with the card',
        type: BadgesDto,
    })
    badges: BadgesDto
    @ApiProperty({
        description: 'Indicates if the card is closed',
        example: false,
    })
    closed: boolean;

    @ApiProperty({
        description: 'Whether the card is due or not',
        example: false,
    })
    dueComplete: boolean;

    @ApiProperty({
        description: 'Date and time of the last activity on the card',
        example: '2024-12-02T09:11:01.685Z',
    })
    dateLastActivity: string;

    @ApiProperty({
        description: 'The description of the card',
        example: '',
    })
    desc: string;

    @ApiProperty({
        description: 'The due date of the card',
        example: '2024-12-03T09:08:27.866Z',
    })
    due: string;

    @ApiProperty({
        description: 'The reminder time for the due date, in minutes',
        example: -1,
    })
    dueReminder: number;

    @ApiProperty({
        description: 'The ID of the board the card is on',
        example: '674436f3f82d54fda5206965',
    })
    idBoard: string;

    @ApiProperty({
        description: 'The ID of the list the card belongs to',
        example: '6745bcd878d5e6a1a1541e1f',
    })
    idList: string;

    @ApiProperty({
        description: 'An array of member IDs assigned to the card',
        example: ['673ef1f4c1d0247b538a4ac3'],
    })
    idMembers: string[];

    @ApiProperty({
        description: 'The name/title of the card',
        example: 'xDDDD',
    })
    name: string;

    @ApiProperty({
        description: 'A short URL link to the card',
        example: 'https://trello.com/c/DDdfdPoF',
    })
    shortUrl: string;

    @ApiProperty({
        description: 'A short unique link identifier for the card',
        example: 'DDdfdPoF',
    })
    shortLink: string;

    @ApiProperty({
        description: 'Whether the current user is subscribed to the card',
        example: true,
    })
    subscribed: boolean;

    @ApiProperty({
        description: 'The full URL link to the card on Trello',
        example: 'https://trello.com/c/DDdfdPoF/3-xdddd',
    })
    url: string;

    @ApiProperty({
        description: 'The start date and time for the card',
        example: '2024-12-02T06:00:27.866Z',
    })
    start: string;
}


