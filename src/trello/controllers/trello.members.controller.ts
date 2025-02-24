import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/guards/jwt.guard';
import {
  ApiCustomNotFoundResponse,
  ApiCustomUnathorizedResponse,
} from 'src/common/decorators/swagger.decorators';

import { TrelloMember } from '../dto/member.dto';
import { Organization } from '../dto/organization.dto';
import { TrelloMembersLogicService } from '../services/logic/trello.members.logic.service';

@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@Controller('trello/members')
export class TrelloMembersController {
  constructor(
    private readonly trelloMembersService: TrelloMembersLogicService,
  ) {}

  @Get('profile')
  @ApiOperation({
    summary: 'Get Trello member profile',
    description:
      'Fetches the profile details of the currently authenticated Trello member.',
  })
  @ApiOkResponse({
    description: 'Trello member profile',
    type: TrelloMember,
  })
  @ApiCustomUnathorizedResponse()
  @ApiCustomNotFoundResponse('User', 'id')
  getTrelloMemberProfile(@Req() req): Promise<TrelloMember> {
    return this.trelloMembersService.findMemberProfile(
      req.user,
      undefined,
      req.i18nContext,
    );
  }

  @Get('organizations')
  @ApiOperation({
    summary: 'Get Trello member organizations',
    description:
      'Fetches the organizations currently authenticated Trello member belongs to.',
  })
  @ApiOkResponse({
    description: 'Trello member organizations',
    type: [Organization],
  })
  @ApiCustomUnathorizedResponse()
  @ApiCustomNotFoundResponse('User', 'id')
  getTrelloMemberOrganizations(@Req() req): Promise<Organization[]> {
    return this.trelloMembersService.findMemberOrganizations(
      req.user,
      req.i18nContext,
    );
  }
}
