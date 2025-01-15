import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import { TrelloBoardsApiService } from '@trello/api';
import { decryptText } from 'src/common/helpers/hashing';
import { validateTrelloToken } from 'src/common/helpers/trello-tokens';
import { User } from 'src/user/entities/user.entity';
import { UsersService } from 'src/user/services/users.service';
import { SharedConfigService } from '../../../config/shared.config.service';
import { TrelloBoard } from '../../dto/board.dto';
import { TrelloBoardField } from '../../enums/trello.model.fields.enum';

/** key=APIKey is this.trelloApiKey of Trello power ups admin app key, which you can find here
 *  https://trello.com/power-ups/admin
 *  token=personal token of each user which he can get by authorizing here
 *  https://trello.com/1/authorize?expiration=never&scope=read&response_type=token&key={YourAPIKey}
 */

@Injectable()
export class TrelloBoardsLogicService {
  private readonly encryptionKey: string;
  private readonly logger = new Logger(TrelloBoardsLogicService.name);

  constructor(
    @Inject(forwardRef(() => UsersService))
    private readonly userService: UsersService,
    private readonly trelloBoardsApiService: TrelloBoardsApiService,
    private readonly sharedConfigService: SharedConfigService,
  ) {
    this.encryptionKey = this.sharedConfigService.getEncryptionKey();
  }

  async findBoardsMemberBelongsTo(user: string | User): Promise<TrelloBoard[]> {
    const requestedUser = await this.userService.getUser(user);

    validateTrelloToken(requestedUser.trello.token);

    const decryptedUserToken = decryptText(
      requestedUser.trello.token,
      this.encryptionKey,
    );

    const response =
      await this.trelloBoardsApiService.fetchBoardsMemberBelongsTo(
        decryptedUserToken,
        requestedUser.trello.userId,
      );

    // Transform the response to only include the necessary fields
    const transformedBoards = response.map((board) => ({
      id: board.id,
      name: board.name,
      desc: board.desc,
      closed: board.closed,
      dateClosed: board.dateClosed,
      pinned: board.pinned,
      starred: board.starred,
      url: board.url,
      shortLink: board.shortLink,
      subscribed: board.subscribed,
      dateLastActivity: board.dateLastActivity,
      dateLastView: board.dateLastView,
      shortUrl: board.shortUrl,
      idMemberCreator: board.idMemberCreator,
      memberships: board.memberships,
    }));

    return transformedBoards;
  }

  async findBoardsInOrganization(
    user: string | User,
    organizationId: string,
  ): Promise<TrelloBoard[]> {
    const requestedUser = await this.userService.getUser(user);

    validateTrelloToken(requestedUser.trello.token);

    const decryptedUserToken = decryptText(
      requestedUser.trello.token,
      this.encryptionKey,
    );

    const response =
      await this.trelloBoardsApiService.fetchBoardsInOrganization(
        decryptedUserToken,
        organizationId,
      );

    const filteredBoards = response.filter((board) =>
      board.memberships.some(
        (membership) => membership.idMember === requestedUser.trello.userId,
      ),
    );

    // Transform the response to only include the necessary fields
    const transformedBoards = filteredBoards.map((board) => ({
      id: board.id,
      name: board.name,
      desc: board.desc,
      closed: board.closed,
      dateClosed: board.dateClosed,
      pinned: board.pinned,
      starred: board.starred,
      url: board.url,
      shortLink: board.shortLink,
      subscribed: board.subscribed,
      dateLastActivity: board.dateLastActivity,
      dateLastView: board.dateLastView,
      shortUrl: board.shortUrl,
      idMemberCreator: board.idMemberCreator,
      memberships: board.memberships,
    }));

    return transformedBoards;
  }

  async findBoardField(
    user: string | User,
    boardId: string,
    fieldName: TrelloBoardField,
  ): Promise<any> {
    const requestedUser = await this.userService.getUser(user);

    validateTrelloToken(requestedUser.trello.token);

    const decryptedUserToken = decryptText(
      requestedUser.trello.token,
      this.encryptionKey,
    );

    const response = await this.trelloBoardsApiService.fetchBoardField(
      decryptedUserToken,
      boardId,
      fieldName,
    );

    return response;
  }

  async findBoardById(
    user: string | User,
    boardId: string,
  ): Promise<TrelloBoard> {
    const requestedUser = await this.userService.getUser(user);

    validateTrelloToken(requestedUser.trello.token);

    const decryptedUserToken = decryptText(
      requestedUser.trello.token,
      this.encryptionKey,
    );

    const boardData = await this.trelloBoardsApiService.fetchBoardById(
      decryptedUserToken,
      boardId,
    );

    const transformedBoard = {
      id: boardData.id,
      name: boardData.name,
      desc: boardData.desc,
      closed: boardData.closed,
      dateClosed: boardData.dateClosed,
      pinned: boardData.pinned,
      starred: boardData.starred,
      url: boardData.url,
      shortLink: boardData.shortLink,
      subscribed: boardData.subscribed,
      dateLastActivity: boardData.dateLastActivity,
      dateLastView: boardData.dateLastView,
      shortUrl: boardData.shortUrl,
      idMemberCreator: boardData.idMemberCreator,
      memberships: boardData.memberships,
    };

    return transformedBoard;
  }

  async findBoardMemberships(
    user: string | User,
    boardId: string,
  ): Promise<any> {
    const requestedUser = await this.userService.getUser(user);

    validateTrelloToken(requestedUser.trello.token);

    const decryptedUserToken = decryptText(
      requestedUser.trello.token,
      this.encryptionKey,
    );

    const response = await this.trelloBoardsApiService.fetchBoardMemberships(
      decryptedUserToken,
      boardId,
    );

    return response.data;
  }
}
