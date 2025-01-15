import { ApiProperty } from '@nestjs/swagger';
import { IBoardMember, ITrelloMember } from '../interfaces/member.interface';

export class TrelloMember implements ITrelloMember {
  @ApiProperty({
    description: 'The unique ID of the Trello member',
    example: '673ef1f4c1d0247b538a4ac3',
  })
  id: string;

  @ApiProperty({
    description: 'Whether the user activity is blocked or not',
    example: false,
  })
  activityBlocked: boolean;

  @ApiProperty({
    description: 'Whether the user is confirmed or not',
    example: true,
  })
  confirmed: boolean;

  @ApiProperty({
    description: 'The full name of the user',
    example: 'Артем',
  })
  fullName: string;

  @ApiProperty({
    description: 'Array of organization IDs where the user is an admin',
    example: ['673ef21fe8635da2c412c5fb'],
  })
  idPremOrgsAdmin: string[];

  @ApiProperty({
    description: 'Initials of the user',
    example: 'А',
  })
  initials: string;

  @ApiProperty({
    description: 'The type of the user (normal, admin, etc.)',
    example: 'normal',
  })
  memberType: string;

  @ApiProperty({
    description: 'Array of product names associated with the user',
    example: [],
  })
  products: string[];

  @ApiProperty({
    description: 'URL of the user profile',
    example: 'https://trello.com/u/userprofile',
  })
  url: string;

  @ApiProperty({
    description: 'Username of the user',
    example: 'user22246838352',
  })
  username: string;

  @ApiProperty({
    description: 'User status (e.g. disconnected, active)',
    example: 'disconnected',
  })
  status: string;

  @ApiProperty({
    description: 'Date and time of the last impression made by the user',
    example: '2024-12-02T08:01:30.010Z',
  })
  dateLastImpression: string;

  @ApiProperty({
    description: 'Date and time of the last activity made by the user',
    example: '2024-12-02T08:23:51.195Z',
  })
  dateLastActive: string;

  @ApiProperty({
    description: 'Email address of the user (nullable)',
    example: null,
  })
  email: string | null;

  @ApiProperty({
    description: 'Array of board IDs the user is associated with',
    example: ['673ef22130ed24174d378374', '674436f3f82d54fda5206965'],
  })
  idBoards: string[];

  @ApiProperty({
    description: 'Array of organization IDs the user is associated with',
    example: ['673ef21fe8635da2c412c5fb'],
  })
  idOrganizations: string[];
}

export class BoardMember implements IBoardMember {
  @ApiProperty({
    description: 'The unique ID of the board member',
    example: '6756f17f2a5dfbe186628950',
  })
  id: string;

  @ApiProperty({
    description: 'The unique ID of the member associated with the board',
    example: '66fe43b09fa2ccff7397732b',
  })
  idMember: string;

  @ApiProperty({
    description: 'The type of the member (e.g., "admin", "normal")',
    example: 'normal',
  })
  memberType: string;

  @ApiProperty({
    description: 'Whether the membership is unconfirmed or not',
    example: false,
  })
  unconfirmed: boolean;

  @ApiProperty({
    description: 'Whether the membership is deactivated or not',
    example: false,
  })
  deactivated: boolean;
}
