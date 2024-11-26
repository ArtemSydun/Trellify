import { Controller, Get, Post, Body, Patch, Param, Delete, Req, UseGuards, HttpStatus } from '@nestjs/common';
import { TrelloService } from '../services/trello.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt.guard';

@Controller('trello/members')
export class TrelloMembersController {
  constructor(private readonly trelloService: TrelloService) { }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  getTrelloMemberProfile(@Req() req) {
    return this.trelloService.findMemberProfile(req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('boards/my')
  findBoardsMemberBelongsTo(@Req() req) {
    return this.trelloService.findBoardsMemberBelongsTo(req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('cards/my')
  findCardsMemberRelatedTo(@Req() req) {
    return this.trelloService.findMemberRelatedCards(req.user.userId);
  }
}
