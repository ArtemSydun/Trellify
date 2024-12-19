import { Controller, Get, Param, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/guards/jwt.guard';
import { ApiCustomNotFoundResponse, ApiCustomUnathorizedResponse } from 'src/common/decorators/swagger.decorators';
import { ApiOkResponse, ApiOperation } from '@nestjs/swagger';

import { TrelloMember } from '../dto/member.dto';
import { TrelloMembersLogicService } from '../services/logic/trello.members.logic.service';

@UseGuards(JwtAuthGuard)
@Controller('trello/members')
export class TrelloMembersController {
  constructor(private readonly trelloMembersService: TrelloMembersLogicService) { }

  @Get('profile')
  @ApiOperation({
    summary: 'Get Trello member profile',
    description: 'Fetches the profile details of the currently authenticated Trello member.'
  })
  @ApiCustomNotFoundResponse('User', 'id')
  @ApiOkResponse({
    description: 'Trello member profile',
    type: TrelloMember,
  })
  @ApiCustomUnathorizedResponse()
  getTrelloMemberProfile(@Req() req): Promise<TrelloMember> {
    return this.trelloMembersService.findMemberProfile(req.user.userId);
  }
}
