import { Controller, Get, Param, Req, UseGuards } from '@nestjs/common';
import { TrelloService } from '../services/trello.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt.guard';
import { ApiCustomNotFoundResponse, ApiCustomUnathorizedResponse } from 'src/common/decorators/swagger.decorators';
import { ApiOkResponse, ApiOperation } from '@nestjs/swagger';
import { Board } from '../dto/board.dto';
import { TrelloMember } from '../dto/member.dto';
import { TrelloCard } from '../dto/card.dto';

@UseGuards(JwtAuthGuard)
@Controller('trello/members')
export class TrelloMembersController {
  constructor(private readonly trelloService: TrelloService) { }

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
    return this.trelloService.findMemberProfile(req.user.userId);
  }

  @Get('boards/my')
  @ApiOperation({
    summary: 'Get list of boards for the current member',
    description: 'Fetches a list of boards that the currently authenticated Trello member belongs to.'
  })
  @ApiCustomUnathorizedResponse()
  @ApiOkResponse({
    description: 'List of member boards',
    type: [Board],
  })
  findBoardsMemberBelongsTo(@Req() req): Promise<Board[]> {
    return this.trelloService.findBoardsMemberBelongsTo(req.user.userId);
  }

  @Get('board/:id')
  @ApiOperation({
    summary: 'Get board by id',
    description: 'Fetch board by ID.'
  })
  @ApiCustomUnathorizedResponse()
  @ApiOkResponse({
    description: 'Board by ID',
    type: Board,
  })
  @ApiCustomNotFoundResponse('Board', 'id')
  getBoardById(@Req() req, @Param(':id') boardId): Promise<Board> {
    return this.trelloService.findBoardById(req.user.userId, boardId);
  }

  @Get('cards/my')
  @ApiOperation({
    summary: 'Get list of cards for the current member',
    description: 'Fetches a list of cards associated with the currently authenticated Trello member.'
  })
  @ApiCustomUnathorizedResponse()
  @ApiOkResponse({
    description: 'List of member cards',
    type: [TrelloCard],
  })
  findCardsMemberRelatedTo(@Req() req): Promise<TrelloCard[]> {
    return this.trelloService.findMemberRelatedCards(req.user.userId);
  }
}
