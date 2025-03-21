import {
  TrelloWebhookListActions,
  TrelloWebhookBoardActions,
  TrelloWebhookCardActions,
  TrelloWebhookChecklistActions,
} from '../../trello/enums/trello.actions.enum';

export const trelloApiLink = 'https://api.trello.com/1';

export const categoryKeysMap: Record<string, string[]> = {
  card: Object.keys(TrelloWebhookCardActions),
  checklist: Object.keys(TrelloWebhookChecklistActions),
  list: Object.keys(TrelloWebhookListActions),
  board: Object.keys(TrelloWebhookBoardActions),
};
