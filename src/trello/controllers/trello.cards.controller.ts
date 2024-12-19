import { Controller, Get, Param, Req } from "@nestjs/common";
import { ApiOperation, ApiOkResponse } from "@nestjs/swagger";
import { ApiCustomNotFoundResponse, ApiCustomUnathorizedResponse } from "src/common/decorators/swagger.decorators";
import { TrelloCard } from "../dto/card.dto";
import { TrelloCardsLogicService } from "../services/logic/trello.cards.logic.service";

@Controller('trello/cards')
export class TrelloCardsController {
  constructor(private readonly cardsService: TrelloCardsLogicService) { }

  @Get('my')
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
    return this.cardsService.findMemberRelatedCards(req.user.userId);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get card by id',
    description: 'Fetch card by ID.'
  })
  @ApiCustomUnathorizedResponse()
  @ApiOkResponse({
    description: 'Card by ID',
    type: TrelloCard,
  })
  @ApiCustomNotFoundResponse('Card', 'id')
  getBoardById(@Req() req, @Param(':id') boardId): Promise<TrelloCard> {
    return this.cardsService.findCardById(req.user.userId, boardId);
  }
}
