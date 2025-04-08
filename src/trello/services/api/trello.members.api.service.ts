import { BadRequestException, Injectable } from '@nestjs/common';
import axios from 'axios';
import { I18nContext } from 'nestjs-i18n';
import { trelloApiLink } from 'src/common/constants/trello';
import { parseTrelloError } from 'src/common/helpers/trello-errors';
import { TrelloMember } from 'src/trello/dto/member.dto';
import { Organization } from 'src/trello/dto/organization.dto';
import { SharedConfigService } from '../../../config/services/shared.config.service';

/** key=APIKey is this.trelloApiKey of Trello power ups admin app key, which you can find here
 *  https://trello.com/power-ups/admin
 *  token=personal token of each user which he can get by authorizing here
 *  https://trello.com/1/authorize?expiration=never&scope=read&response_type=token&key={YourAPIKey}
 */

@Injectable()
export class TrelloMembersApiService {
  private readonly trelloApiKey: string;

  constructor(private readonly sharedConfigService: SharedConfigService) {
    this.trelloApiKey = this.sharedConfigService.getTrelloApiKey();
  }

  // # Member
  async fetchMemberProfile(
    token: string,
    i18n?: I18nContext,
  ): Promise<TrelloMember> {
    const url = `${trelloApiLink}/members/me?key=${this.trelloApiKey}&token=${token}`;
    try {
      const response = await axios.get(url);

      return response.data;
    } catch (err) {
      const errorMessage = parseTrelloError(err, i18n);
      throw new BadRequestException(errorMessage);
    }
  }

  async fetchMemberOrganizations(
    trelloUserId: string,
    token: string,
    i18n?: I18nContext,
  ): Promise<Organization[]> {
    const url = `${trelloApiLink}/members/${trelloUserId}/organizations?key=${this.trelloApiKey}&token=${token}`;
    try {
      const response = await axios.get(url);
      return response.data;
    } catch (err) {
      const errorMessage = parseTrelloError(err, i18n);
      throw new BadRequestException(errorMessage);
    }
  }
}
