import { Controller } from '@nestjs/common';
import { TrelloTokensApiService } from '../services/api/trello.tokens.api.service';

@Controller('trello/tokens')
export class TrelloTokensController {
  constructor(private readonly tokensService: TrelloTokensApiService) {}
}
