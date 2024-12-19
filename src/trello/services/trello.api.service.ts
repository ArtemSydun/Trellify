import {
    BadRequestException,
    Injectable,
    UnauthorizedException,
} from '@nestjs/common';
import axios from 'axios';
import { trelloApiLink } from 'src/common/constants/trello';
import { SharedConfigService } from './shared.config.service';
import { TrelloBoardField } from '../enums/trello.model.fields.enum';
import { Board } from '../dto/board.dto';
import { TrelloCard } from '../dto/card.dto';
import { TrelloMember } from '../dto/member.dto';

/** key=APIKey is this.trelloApiKey of Trello power ups admin app key, which you can find here
 *  https://trello.com/power-ups/admin
 *  token=personal token of each user which he can get by authorizing here
 *  https://trello.com/1/authorize?expiration=never&scope=read&response_type=token&key={YourAPIKey}
 */

@Injectable()
export class TrelloApiService {
    private readonly trelloApiKey: string;

    constructor(
        private readonly sharedConfigService: SharedConfigService,
    ) {
        this.trelloApiKey = this.sharedConfigService.getTrelloApiKey();
    }

    // # Boards
    async fetchBoardsMemberBelongsTo(token: string, trelloUserId: string): Promise<Board[]> {
        const url = `${trelloApiLink}/members/${trelloUserId}/boards?key=${this.trelloApiKey}&token=${token}`;

        try {
            const response = await axios.get(url);

            return response.data;
        } catch (err) {
            throw new BadRequestException(err.response ? err.response.data : err.message);
        }
    }

    async fetchBoardField(token: string, boardId: string, fieldName: TrelloBoardField): Promise<any> {
        const url = `${trelloApiLink}/boards/${boardId}/${fieldName}?key=${this.trelloApiKey}&token=${token}`;

        //here we normalize response especially for this request
        try {
            const response = await axios.get(url);

            let result;

            if ('_value' in response.data) {
                result = { value: response.data._value };
            } else {
                result = { value: response.data };
            }


            return result;
        } catch (err) {
            throw new BadRequestException(err.response ? err.response.data : err.message);
        }
    }

    async fetchBoardById(token: string, boardId: string): Promise<Board> {
        const url = `${trelloApiLink}/boards/${boardId}?key=${this.trelloApiKey}&token=${token}`;

        try {
            const response = await axios.get(url);

            return response.data;
        } catch (err) {
            throw new BadRequestException(err.response ? err.response.data : err.message);
        }
    }

    async fetchBoardMemberships(token: string, boardId: string): Promise<any> {
        const url = `${trelloApiLink}/boards/${boardId}/memberships?key=${this.trelloApiKey}&token=${token}`;

        try {
            const response = await axios.get(url);
            return response.data;
        } catch (err) {
            throw new BadRequestException(err.response ? err.response.data : err.message);
        }
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

    // # Members
    async fetchMemberProfile(token: string): Promise<TrelloMember> {
        try {
            const response = await axios.get(`${trelloApiLink}/members/me?key=${this.trelloApiKey}&token=${token}`);
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

    // # Tokens
    async fetchAccessToken(token: string): Promise<any> {
        const url = `${trelloApiLink}/tokens/${token}?key=${this.trelloApiKey}&token=${token}`;

        try {
            const response = await axios.get(url);
            return response.data;
        } catch (err) {
            throw new UnauthorizedException('Invalid token');
        }
    }

    // # Webhooks
    async createWebhook(creatorToken: string, callbackUrl: string, idModel: string) {
        const url = `${trelloApiLink}/webhooks/?callbackURL=${callbackUrl}&idModel=${idModel}&key=${this.trelloApiKey}&token=${creatorToken}`;

        try {
            const response = await axios.post(url);
            return response.data;
        } catch (err) {
            throw new BadRequestException(err.response ? err.response.data : err.message);
        }
    }

    async deleteWebhook(creatorToken: string, webhookId: string): Promise<any> {
        const url = `${trelloApiLink}/webhooks/${webhookId}?key=${this.trelloApiKey}&token=${creatorToken}`;

        try {
            const response = await axios.delete(url);
            return response.data;
        } catch (err) {
            throw new BadRequestException(err.response ? err.response.data : err.message);
        }
    }
}
