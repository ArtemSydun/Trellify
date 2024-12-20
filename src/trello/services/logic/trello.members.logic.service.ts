import {
  BadRequestException,
  forwardRef,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { UsersService } from 'src/user/services/users.service';
import { decryptText } from 'src/common/helpers/hashing';
import { SharedConfigService } from '../../../config/shared.config.service';
import { User } from 'src/user/entities/user.entity';
import { TrelloMember } from '../../dto/member.dto';
import { TrelloMembersApiService } from '../api/trello.members.api.service';
import { Organization } from 'src/trello/dto/organization.dto';
import { validateTrelloToken } from 'src/common/helpers/trello-tokens';


/** key=APIKey is this.trelloApiKey of Trello power ups admin app key, which you can find here
 *  https://trello.com/power-ups/admin
 *  token=personal token of each user which he can get by authorizing here
 *  https://trello.com/1/authorize?expiration=never&scope=read&response_type=token&key={YourAPIKey}
 */

@Injectable()
export class TrelloMembersLogicService {
  private readonly encryptionKey: string;
  private readonly logger = new Logger(TrelloMembersLogicService.name);

  constructor(
    @Inject(forwardRef(() => UsersService))
    private readonly userService: UsersService,
    private readonly sharedConfigService: SharedConfigService,
    private readonly trelloMembersApiService: TrelloMembersApiService,
  ) {
    this.encryptionKey = this.sharedConfigService.getEncryptionKey();
  }

  async findMemberProfile(user: string | User, token?: string): Promise<TrelloMember> {
    const userToFind = await this.userService.getUser(user);
    validateTrelloToken(userToFind.trello.token);
    const decryptedUserToken = token
      ? decryptText(token, this.encryptionKey)
      : decryptText(userToFind.trello.token, this.encryptionKey);

    const response = await this.trelloMembersApiService.fetchMemberProfile(decryptedUserToken);

    return response;
  }

  async findMemberOrganizations(user: string | User): Promise<Organization[]> {
    const userToFind = await this.userService.getUser(user);

    validateTrelloToken(userToFind.trello.token);
    
    const decryptedUserToken = decryptText(userToFind.trello.token, this.encryptionKey);

    const response = await this.trelloMembersApiService.fetchMemberOrganizations(userToFind.trello.userId, decryptedUserToken);

    const normalizedOrganizations: Organization[] = response.map((organization) => ({
      id: organization.id,
      name: organization.name,
      displayName: organization.displayName,
      domainName: organization.domainName,
      idBoards: organization.idBoards,
      idEnterprise: organization.idEnterprise || null,
      idEntitlement: organization.idEntitlement || null,
      idMemberCreator: organization.idMemberCreator,
      membersCount: organization.membersCount,
      url: organization.url,
      website: organization.website || null,
      dateLastActivity: organization.dateLastActivity,
      memberships: organization.memberships,
    }));

    return normalizedOrganizations;
  }
}
