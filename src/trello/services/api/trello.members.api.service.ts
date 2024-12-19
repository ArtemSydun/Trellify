import {
    BadRequestException,
    Injectable,
} from '@nestjs/common';
import axios from 'axios';
import { trelloApiLink } from 'src/common/constants/trello';
import { SharedConfigService } from '../../../common/config/shared.config.service';

import { TrelloMember } from 'src/trello/dto/member.dto';


/** key=APIKey is this.trelloApiKey of Trello power ups admin app key, which you can find here
 *  https://trello.com/power-ups/admin
 *  token=personal token of each user which he can get by authorizing here
 *  https://trello.com/1/authorize?expiration=never&scope=read&response_type=token&key={YourAPIKey}
 */

@Injectable()
export class TrelloMembersApiService {
    private readonly trelloApiKey: string;

    constructor(
        private readonly sharedConfigService: SharedConfigService,
    ) {
        this.trelloApiKey = this.sharedConfigService.getTrelloApiKey();
    }

    // # Member
    async fetchMemberProfile(token: string): Promise<TrelloMember> {
        try {
            const response = await axios.get(`${trelloApiLink}/members/me?key=${this.trelloApiKey}&token=${token}`);
            return response.data;
        } catch (err) {
            throw new BadRequestException(err.response ? err.response.data : err.message);
        }
    }
}
