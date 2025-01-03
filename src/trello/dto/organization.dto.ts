import { ApiProperty } from '@nestjs/swagger';
import { BoardMember } from './member.dto';
import { IBoardMember } from '../interfaces/member.interface';
import { IOrganization } from '../interfaces/organization.interface';

export class Organization implements IOrganization {
    @ApiProperty({
        description: 'Unique identifier for the organization.',
        example: '674ec80dd95f8b1bbce1918c',
    })
    id: string;

    @ApiProperty({
        description: 'Internal name of the organization.',
        example: 'notifybot2',
    })
    name: string;

    @ApiProperty({
        description: 'Display name of the organization.',
        example: 'notify-bot',
    })
    displayName: string;

    @ApiProperty({
        description: 'Domain name associated with the organization.',
        example: 'work.space',
    })
    domainName: string;

    @ApiProperty({
        description: 'List of board IDs associated with the organization.',
        type: [String],
        example: ['67570886e58adaf576a80adf', '674effbbec92770cb360eacd'],
    })
    idBoards: string[];

    @ApiProperty({
        description: 'Enterprise ID associated with the organization, if any.',
        example: null,
    })
    idEnterprise: string | null;

    @ApiProperty({
        description: 'Entitlement ID associated with the organization, if any.',
        example: null,
    })
    idEntitlement: string | null;

    @ApiProperty({
        description: 'ID of the member who created the organization.',
        example: '674ec752cba1224342f87c20',
    })
    idMemberCreator: string;

    @ApiProperty({
        description: 'Total number of members in the organization.',
        example: 2,
    })
    membersCount: number;

    @ApiProperty({
        description: 'URL to access the organization on Trello.',
        example: 'https://trello.com/w/workspace1',
    })
    url: string;

    @ApiProperty({
        description: 'Website associated with the organization, if any.',
        example: null,
    })
    website: string | null;

    @ApiProperty({
        description: 'Timestamp of the last activity in the organization.',
        example: '2024-12-17T09:44:48.123Z',
    })
    dateLastActivity: string;

    @ApiProperty({
        description: 'Array of membership details for the organization.',
        type: [BoardMember],
    })
    memberships: IBoardMember[];
}
