import {
    BadRequestException,
    Injectable,
} from '@nestjs/common';
import axios from 'axios';
import { trelloApiLink } from 'src/common/constants/trello';
import { SharedConfigService } from '../../../config/shared.config.service';
import { TrelloBoardField } from '../../enums/trello.model.fields.enum';
import { Board } from '../../dto/board.dto';

/** key=APIKey is this.trelloApiKey of Trello power ups admin app key, which you can find here
 *  https://trello.com/power-ups/admin
 *  token=personal token of each user which he can get by authorizing here
 *  https://trello.com/1/authorize?expiration=never&scope=read&response_type=token&key={YourAPIKey}
 */

@Injectable()
export class TrelloBoardsApiService {
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

    async fetchBoardsInOrganization(token: string, organizationId: string): Promise<Board[]> {
        const url = `${trelloApiLink}/organizations/${organizationId}/boards?key=${this.trelloApiKey}&token=${token}`;

        try {
            const response = await axios.get(url);

            return response.data;
        } catch (err) {
            throw new BadRequestException(err.response ? err.response.data : err.message);
        }
    }
}
