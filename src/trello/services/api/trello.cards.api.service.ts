import {
    BadRequestException,
    Injectable,
} from '@nestjs/common';
import axios from 'axios';
import { trelloApiLink } from 'src/common/constants/trello';
import { SharedConfigService } from '../../../config/shared.config.service';

import { TrelloCard } from '../../dto/card.dto';


/** key=APIKey is this.trelloApiKey of Trello power ups admin app key, which you can find here
 *  https://trello.com/power-ups/admin
 *  token=personal token of each user which he can get by authorizing here
 *  https://trello.com/1/authorize?expiration=never&scope=read&response_type=token&key={YourAPIKey}
 */

@Injectable()
export class TrelloCardsApiService {
    private readonly trelloApiKey: string;

    constructor(
        private readonly sharedConfigService: SharedConfigService,
    ) {
        this.trelloApiKey = this.sharedConfigService.getTrelloApiKey();
    }

    // # Cards
    async fetchCardById(token: string, cardId: string): Promise<TrelloCard> {
        const url = `${trelloApiLink}/cards/${cardId}?key=${this.trelloApiKey}&token=${token}`;

        try {
            const response = await axios.get(url);
            return response.data;
        } catch (err) {
            throw new BadRequestException(err.response ? err.response.data : err.message);
        }
    }

    async fetchMemberRelatedCards(token: string, trelloUserId: string): Promise<TrelloCard[]> {
        const url = `${trelloApiLink}/members/${trelloUserId}/cards?key=${this.trelloApiKey}&token=${token}`;

        try {
            const response = await axios.get(url);
            return response.data;
        } catch (err) {
            throw new BadRequestException(err.response ? err.response.data : err.message);
        }
    }
}
