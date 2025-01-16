import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import { TrelloMembersApiService } from '@trello/api';
import { I18nContext } from 'nestjs-i18n';
import { decryptText } from 'src/common/helpers/hashing';
import { validateTrelloToken } from 'src/common/helpers/trello-tokens';
import { Organization } from 'src/trello/dto/organization.dto';
import { User } from 'src/user/entities/user.entity';
import { UsersService } from 'src/user/services/users.service';
import { SharedConfigService } from '../../../config/shared.config.service';
import { TrelloMember } from '../../dto/member.dto';

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

  async findMemberProfile(
    user: string | User,
    token?: string,
    i18n?: I18nContext,
  ): Promise<TrelloMember> {
    const userToFind = await this.userService.getUser(user, i18n);

    if (token) {
      validateTrelloToken(decryptText(token, this.encryptionKey), i18n);
    } else {
      validateTrelloToken(
        decryptText(userToFind.trello.token, this.encryptionKey),
        i18n,
      );
    }

    const decryptedUserToken = token
      ? decryptText(token, this.encryptionKey)
      : decryptText(userToFind.trello.token, this.encryptionKey);

    const response =
      await this.trelloMembersApiService.fetchMemberProfile(decryptedUserToken);

    const memberProfile: TrelloMember = {
      id: response.id,
      activityBlocked: response.activityBlocked,
      confirmed: response.confirmed,
      fullName: response.fullName,
      idPremOrgsAdmin: response.idPremOrgsAdmin || [],
      initials: response.initials,
      memberType: response.memberType,
      products: response.products || [],
      url: response.url,
      username: response.username,
      status: response.status,
      dateLastImpression: response.dateLastImpression,
      dateLastActive: response.dateLastActive,
      email: response.email || null,
      idBoards: response.idBoards || [],
      idOrganizations: response.idOrganizations || [],
    };

    return memberProfile;
  }

  async findMemberOrganizations(
    user: string | User,
    i18n?: I18nContext,
  ): Promise<Organization[]> {
    const userToFind = await this.userService.getUser(user);

    validateTrelloToken(userToFind.trello.token, i18n);

    const decryptedUserToken = decryptText(
      userToFind.trello.token,
      this.encryptionKey,
    );

    const response =
      await this.trelloMembersApiService.fetchMemberOrganizations(
        userToFind.trello.userId,
        decryptedUserToken,
      );

    const normalizedOrganizations: Organization[] = response.map(
      (organization: Organization) => ({
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
      }),
    );

    return normalizedOrganizations;
  }
}
