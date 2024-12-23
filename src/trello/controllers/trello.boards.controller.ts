import { Controller, Get, Req, Param, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiOkResponse } from '@nestjs/swagger';
import { TrelloBoardsLogicService } from '../services/logic/trello.boards.logic.service';
import { TrelloBoard } from '../dto/board.dto';
import { ApiCustomUnathorizedResponse, ApiCustomNotFoundResponse } from 'src/common/decorators/swagger.decorators';
import { JwtAuthGuard } from 'src/auth/guards/jwt.guard';

@UseGuards(JwtAuthGuard)
@Controller('trello/boards')
export class TrelloBoardsController {
  constructor(private readonly boardsService: TrelloBoardsLogicService) { }

  @Get('my')
  @ApiOperation({
    summary: 'Get list of boards for the current member',
    description: 'Fetches a list of boards that the currently authenticated Trello member belongs to.'
  })
  @ApiOkResponse({
    description: 'List of member boards',
    type: [TrelloBoard],
  })
  @ApiCustomUnathorizedResponse()
  findBoardsMemberBelongsTo(@Req() req): Promise<TrelloBoard[]> {
    return this.boardsService.findBoardsMemberBelongsTo(req.user.userId);
  }

  @Get('organizations/:organizationId')
  @ApiOperation({
    summary: 'Get list of boards in workspace',
    description: 'Fetches a list of boards in workspace.'
  })
  @ApiOkResponse({
    description: 'List of workspace boards',
    type: [TrelloBoard],
  })
  @ApiCustomUnathorizedResponse()
  findOrganizationBoards(@Req() req, @Param('organizationId') organizationId): Promise<TrelloBoard[]> {
    return this.boardsService.findBoardsInOrganization(req.user.userId, organizationId);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get board by id',
    description: 'Fetch board by ID.'
  })
  @ApiOkResponse({
    description: 'TrelloBoard by ID',
    type: TrelloBoard,
  })
  @ApiCustomUnathorizedResponse()
  @ApiCustomNotFoundResponse('TrelloBoard', 'id')
  getBoardById(@Req() req, @Param(':id') boardId): Promise<TrelloBoard> {
    return this.boardsService.findBoardById(req.user.userId, boardId);
  }
}
