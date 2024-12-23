import { Controller, Get, Req, Param, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiOkResponse } from '@nestjs/swagger';
import { TrelloBoardsLogicService } from '../services/logic/trello.boards.logic.service';
import { Board } from '../dto/board.dto';
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
    type: [Board],
  })
  @ApiCustomUnathorizedResponse()
  findBoardsMemberBelongsTo(@Req() req): Promise<Board[]> {
    return this.boardsService.findBoardsMemberBelongsTo(req.user.userId);
  }

  @Get('organizations/:organizationId')
  @ApiOperation({
    summary: 'Get list of boards in workspace',
    description: 'Fetches a list of boards in workspace.'
  })
  @ApiOkResponse({
    description: 'List of workspace boards',
    type: [Board],
  })
  @ApiCustomUnathorizedResponse()
  findOrganizationBoards(@Req() req, @Param('organizationId') organizationId): Promise<Board[]> {
    return this.boardsService.findBoardsInOrganization(req.user.userId, organizationId);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get board by id',
    description: 'Fetch board by ID.'
  })
  @ApiOkResponse({
    description: 'Board by ID',
    type: Board,
  })
  @ApiCustomUnathorizedResponse()
  @ApiCustomNotFoundResponse('Board', 'id')
  getBoardById(@Req() req, @Param(':id') boardId): Promise<Board> {
    return this.boardsService.findBoardById(req.user.userId, boardId);
  }
}
