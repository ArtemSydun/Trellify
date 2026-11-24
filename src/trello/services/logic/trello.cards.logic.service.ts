import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import { TrelloCardsApiService } from '@trello/api';
import { I18nContext } from 'nestjs-i18n';
import { decryptText } from 'src/common/helpers/hashing';
import { validateTrelloToken } from 'src/common/helpers/trello-tokens';
import { User } from 'src/user/entities/user.entity';
import { UsersService } from 'src/user/services/users.service';
import { SharedConfigService } from '../../../config/services/shared.config.service';
import { TrelloCard } from '../../dto/card.dto';

/** key=APIKey is this.trelloApiKey of Trello power ups admin app key, which you can find here
 *  https://trello.com/power-ups/admin
 *  token=personal token of each user which he can get by authorizing here
 *  https://trello.com/1/authorize?expiration=never&scope=read&response_type=token&key={YourAPIKey}
 */

@Injectable()
export class TrelloCardsLogicService {
  private readonly encryptionKey: string;
  private readonly logger = new Logger(TrelloCardsLogicService.name);

  constructor(
    @Inject(forwardRef(() => UsersService))
    private readonly userService: UsersService,
    private readonly sharedConfigService: SharedConfigService,
    private readonly trelloCardsApiService: TrelloCardsApiService,
  ) {
    this.encryptionKey = this.sharedConfigService.getEncryptionKey();
  }

  async findCardById(
    user: string | User,
    cardId: string,
    i18n?: I18nContext,
  ): Promise<TrelloCard> {
    const requestedUser = await this.userService.getUser(user);

    validateTrelloToken(requestedUser.trello.token, i18n);

    const decryptedUserToken = decryptText(
      requestedUser.trello.token,
      this.encryptionKey,
    );

    const card = await this.trelloCardsApiService.fetchCardById(
      decryptedUserToken,
      cardId,
    );

    return card;
  }

  async findMemberRelatedCards(
    user: string | User,
    i18n?: I18nContext,
  ): Promise<TrelloCard[]> {
    const userToFind = await this.userService.getUser(user);

    validateTrelloToken(userToFind.trello.token, i18n);

    const decryptedUserToken = decryptText(
      userToFind.trello.token,
      this.encryptionKey,
    );

    const response = await this.trelloCardsApiService.fetchMemberRelatedCards(
      decryptedUserToken,
      userToFind.trello.userId,
    );

    return response;
  }
}
