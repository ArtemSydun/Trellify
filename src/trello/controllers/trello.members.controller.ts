import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { TrelloService } from '../services/trello.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt.guard';
import { ApiCustomNotFoundResponse, ApiCustomUnathorizedResponse } from 'src/common/decorators/swagger.decorators';

@UseGuards(JwtAuthGuard)
@Controller('trello/members')
export class TrelloMembersController {
  constructor(private readonly trelloService: TrelloService) { }

  @ApiCustomNotFoundResponse('User', 'id')
  @ApiCustomUnathorizedResponse()
  @Get('profile')
  getTrelloMemberProfile(@Req() req) {
    return this.trelloService.findMemberProfile(req.user.userId);
  }

  @ApiCustomUnathorizedResponse()
  @Get('boards/my')
  findBoardsMemberBelongsTo(@Req() req) {
    return this.trelloService.findBoardsMemberBelongsTo(req.user.userId);
  }

  @ApiCustomUnathorizedResponse()
  @Get('cards/my')
  findCardsMemberRelatedTo(@Req() req) {
    return this.trelloService.findMemberRelatedCards(req.user.userId);
  }
}
