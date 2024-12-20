import { ApiProperty } from '@nestjs/swagger';
import { BoardMember } from './member.dto';
import { IBoardMember } from '../interfaces/member.interface';
import { IOrganization } from '../interfaces/organization.interface';

export class Organization implements IOrganization {
    @ApiProperty({ example: '674ec80dd95f8b1bbce1918c' })
    id: string;

    @ApiProperty({ example: 'notifybot2' })
    name: string;

    @ApiProperty({ example: 'notify-bot' })
    displayName: string;

    @ApiProperty({ example: 'work.space' })
    domainName: string;

    @ApiProperty({ type: [String], example: ['67570886e58adaf576a80adf', '674effbbec92770cb360eacd'] })
    idBoards: string[];

    @ApiProperty({ example: null })
    idEnterprise: string | null;

    @ApiProperty({ example: null })
    idEntitlement: string | null;

    @ApiProperty({ example: '674ec752cba1224342f87c20' })
    idMemberCreator: string;

    @ApiProperty({ example: 2 })
    membersCount: number;

    @ApiProperty({ example: 'https://trello.com/w/workspace1' })
    url: string;

    @ApiProperty({ example: null })
    website: string | null;

    @ApiProperty({ example: '2024-12-17T09:44:48.123Z' })
    dateLastActivity: string;

    @ApiProperty({
        description: 'Organization memberships array',
        type: [BoardMember]
    })
    memberships: IBoardMember[]
}