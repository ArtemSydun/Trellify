import {
  TrelloWebhookAdminActions,
  TrelloWebhookBoardActions,
  TrelloWebhookCardActions,
  TrelloWebhookDetailedActions,
  TrelloWebhookPersonalActions,
} from '../../trello/enums/trello.actions.enum';

export const trelloApiLink = 'https://api.trello.com/1';

export const basicProfileActions = [
  TrelloWebhookDetailedActions.CARD_RENAMED,
  TrelloWebhookDetailedActions.CARD_MEMBER_ADDED,
  TrelloWebhookDetailedActions.CARD_MEMBER_REMOVED,
  TrelloWebhookDetailedActions.CARD_COMMENT_ADDED,
  TrelloWebhookDetailedActions.CARD_ATTACHMENT_ADDED,
  TrelloWebhookDetailedActions.CARD_DUE_DATE_ADDED,
  TrelloWebhookDetailedActions.CARD_DUE_DATE_CHANGED,
  TrelloWebhookDetailedActions.CARD_START_DATE_ADDED,
  TrelloWebhookDetailedActions.CARD_START_DATE_CHANGED,
  TrelloWebhookDetailedActions.CARD_MOVED_TO_LIST,
  TrelloWebhookDetailedActions.BOARD_MEMBER_REMOVED,
];

export const advancedProfileActions = [
  ...basicProfileActions,
  TrelloWebhookDetailedActions.CARD_LABEL_ADDED,
  TrelloWebhookDetailedActions.CARD_LABEL_REMOVED,
  TrelloWebhookDetailedActions.CARD_CHECKLIST_ADDED,
  TrelloWebhookDetailedActions.CARD_CHECKLIST_REMOVED,
  TrelloWebhookDetailedActions.CHECKLIST_ITEM_ADDED,
  TrelloWebhookDetailedActions.CHECKLIST_ITEM_DELETED,
  TrelloWebhookDetailedActions.CHECKLIST_ITEM_STATE_CHANGED_COMPLETED,
  TrelloWebhookDetailedActions.CHECKLIST_ITEM_STATE_CHANGED_INCOMPLETED,
  TrelloWebhookDetailedActions.BOARD_MEMBER_REMOVED,
];

export const fullProfileActions = [
  ...advancedProfileActions,
  TrelloWebhookDetailedActions.CARD_ARCHIVED,
  TrelloWebhookDetailedActions.CARD_MEMBER_JOINED,
  TrelloWebhookDetailedActions.CARD_MEMBER_LEFT,
  TrelloWebhookDetailedActions.CHECKLIST_ITEM_MEMBER_ADDED,
  TrelloWebhookDetailedActions.CHECKLIST_ITEM_MEMBER_REMOVED,
  TrelloWebhookDetailedActions.CHECKLIST_ITEM_MEMBER_JOINED,
  TrelloWebhookDetailedActions.CHECKLIST_ITEM_MEMBER_LEFT,
  TrelloWebhookDetailedActions.CHECKLIST_ITEM_DUE_DATE_DELETED,
  TrelloWebhookDetailedActions.CHECKLIST_ITEM_DUE_DATE_UPDATED,
  TrelloWebhookDetailedActions.CHECKLIST_ITEM_CONVERTED_TO_CARD,
  TrelloWebhookDetailedActions.BOARD_RENAMED,
  TrelloWebhookDetailedActions.BOARD_MEMBER_LEFT,
  TrelloWebhookDetailedActions.BOARD_MEMBER_JOINED,
  TrelloWebhookDetailedActions.BOARD_ADMIN_ADDED,
  TrelloWebhookDetailedActions.BOARD_MEMBER_NORMAL_ROLE_ADDED,
  TrelloWebhookDetailedActions.BOARD_MEMBER_INVITATION_JOINED,
  TrelloWebhookDetailedActions.BOARD_CLOSED,
  TrelloWebhookDetailedActions.BOARD_REOPENED,
  TrelloWebhookDetailedActions.CUSTOM_FIELD_CREATED,
  TrelloWebhookDetailedActions.CUSTOM_FIELD_UPDATED,
  TrelloWebhookDetailedActions.CUSTOM_FIELD_ITEM_UPDATED,
  TrelloWebhookDetailedActions.CUSTOM_FIELD_RENAMED,
];

export const categoryKeysMap: Record<string, string[]> = {
  personal: Object.keys(TrelloWebhookPersonalActions),
  board: Object.keys(TrelloWebhookBoardActions),
  card: Object.keys(TrelloWebhookCardActions),
  admin: Object.keys(TrelloWebhookAdminActions),
};
