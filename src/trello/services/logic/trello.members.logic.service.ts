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
import { TrelloBoardField } from '../../enums/trello.model.fields.enum';
import { User } from 'src/user/entities/user.entity';
import { Board } from '../../dto/board.dto';
import { TrelloCard } from '../../dto/card.dto';
import { TrelloMember } from '../../dto/member.dto';
import { TrelloMembersApiService } from '../api/trello.members.api.service';


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

    console.log(decryptText(userToFind.trello.token, this.encryptionKey));
    const decryptedUserToken = token
      ? decryptText(token, this.encryptionKey)
      : decryptText(userToFind.trello.token, this.encryptionKey);

    const response = await this.trelloMembersApiService.fetchMemberProfile(decryptedUserToken);

    return response;
  }
}
