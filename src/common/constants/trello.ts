import { TrelloWebhookDetailedActions } from "../../trello/enums/trello.actions.enum";

export const trelloApiLink = 'https://api.trello.com/1';

export const actionsEnabledByDefault = [
    TrelloWebhookDetailedActions.CARD_RENAMED,
    TrelloWebhookDetailedActions.CARD_DUE_DATE_ADDED,
    TrelloWebhookDetailedActions.CARD_DUE_DATE_CHANGED,
    TrelloWebhookDetailedActions.CARD_START_DATE_ADDED,
    TrelloWebhookDetailedActions.CARD_START_DATE_CHANGED,
    TrelloWebhookDetailedActions.CARD_CHECKLIST_ADDED,
    TrelloWebhookDetailedActions.BOARD_MEMBER_REMOVED,
    TrelloWebhookDetailedActions.CARD_ATTACHMENT_ADDED,
    TrelloWebhookDetailedActions.CARD_MEMBER_ADDED,
    TrelloWebhookDetailedActions.CARD_MEMBER_REMOVED,
    TrelloWebhookDetailedActions.CARD_COMMENT_ADDED,
    TrelloWebhookDetailedActions.CARD_MOVED_TO_LIST
];
