import {
    BadRequestException,
    Injectable,
    UnauthorizedException,
} from '@nestjs/common';
import axios from 'axios';
import { trelloApiLink } from 'src/common/constants/trello';
import { SharedConfigService } from '../../../config/shared.config.service';

/** key=APIKey is this.trelloApiKey of Trello power ups admin app key, which you can find here
 *  https://trello.com/power-ups/admin
 *  token=personal token of each user which he can get by authorizing here
 *  https://trello.com/1/authorize?expiration=never&scope=read&response_type=token&key={YourAPIKey}
 */

@Injectable()
export class TrelloTokensApiService {
    private readonly trelloApiKey: string;

    constructor(
        private readonly sharedConfigService: SharedConfigService,
    ) {
        this.trelloApiKey = this.sharedConfigService.getTrelloApiKey();
    }

    // # Tokens
    async fetchAccessToken(token: string): Promise<any> {
        const url = `${trelloApiLink}/tokens/${token}?key=${this.trelloApiKey}&token=${token}`;

        try {
            const response = await axios.get(url);
            return response.data;
        } catch (err) {
            console.log(err);
            throw new BadRequestException('Invalid trello token');
        }
    }
}
