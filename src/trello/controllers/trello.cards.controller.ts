import { Controller, Get, Param, Req, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiOkResponse } from "@nestjs/swagger";
import { ApiCustomNotFoundResponse, ApiCustomUnathorizedResponse } from "src/common/decorators/swagger.decorators";
import { TrelloCard } from "../dto/card.dto";
import { TrelloCardsLogicService } from "../services/logic/trello.cards.logic.service";
import { JwtAuthGuard } from "src/auth/guards/jwt.guard";

@UseGuards(JwtAuthGuard)
@Controller('trello/cards')
export class TrelloCardsController {
  constructor(private readonly cardsService: TrelloCardsLogicService) { }

  @Get('my')
  @ApiOperation({
    summary: 'Get list of cards for the current member',
    description: 'Fetches a list of cards associated with the currently authenticated Trello member.'
  })
  @ApiOkResponse({
    description: 'List of member cards',
    type: [TrelloCard],
  })
  @ApiCustomUnathorizedResponse()
  findCardsMemberRelatedTo(@Req() req): Promise<TrelloCard[]> {
    return this.cardsService.findMemberRelatedCards(req.user.id);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get card by id',
    description: 'Fetch card by ID.'
  })
  @ApiOkResponse({
    description: 'Card by ID',
    type: TrelloCard,
  })
  @ApiCustomUnathorizedResponse()
  @ApiCustomNotFoundResponse('Card', 'id')
  getBoardById(@Req() req, @Param(':id') boardId): Promise<TrelloCard> {
    return this.cardsService.findCardById(req.user.id, boardId);
  }
}
