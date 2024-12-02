import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { TrelloService } from '../services/trello.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt.guard';
import { ApiCustomNotFoundResponse, ApiCustomUnathorizedResponse } from 'src/common/decorators/swagger.decorators';
import { ApiOkResponse } from '@nestjs/swagger';
import { Board } from '../dto/board.dto';
import { TrelloMember } from '../dto/member.dto';
import { TrelloCard } from '../dto/card.dto';

@UseGuards(JwtAuthGuard)
@Controller('trello/members')
export class TrelloMembersController {
  constructor(private readonly trelloService: TrelloService) { }

  @Get('profile')
  @ApiCustomNotFoundResponse('User', 'id')
  @ApiOkResponse({
    description: 'Trello member profile',
    type: TrelloMember,
  })
  @ApiCustomUnathorizedResponse()
  getTrelloMemberProfile(@Req() req): Promise<TrelloMember> {
    return this.trelloService.findMemberProfile(req.user.userId);
  }

  @Get('boards/my')
  @ApiCustomUnathorizedResponse()
  @ApiOkResponse({
    description: 'List of member boards',
    type: [Board],
  })
  findBoardsMemberBelongsTo(@Req() req): Promise<Board[]> {
    return this.trelloService.findBoardsMemberBelongsTo(req.user.userId);
  }

  @Get('cards/my')
  @ApiCustomUnathorizedResponse()
  @ApiOkResponse({
    description: 'List of member cards',
    type: [TrelloCard],
  })
  findCardsMemberRelatedTo(@Req() req): Promise<TrelloCard[]> {
    return this.trelloService.findMemberRelatedCards(req.user.userId);
  }
}
