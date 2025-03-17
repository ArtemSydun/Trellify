// actions which are without proper "translationKey" (detailed action type)
// updateComment ("unknown"),  deleteComment ("unknown")
// some actions on updateCard ("unknown"), for example changing card color / deadline notification update / removing label from card
// createCheckItem ("unknown"),

// commented actions do not have notification properties
export enum TrelloWebhookActions {
  CARD_MEMBER_REMOVED = 'removeMemberFromCard',
  CARD_MEMBER_ADDED = 'addMemberToCard',
  CARD_MOVED_FROM_BOARD = 'moveCardFromBoard',
  CARD_MOVED_TO_BOARD = 'moveCardToBoard',
  CARD_UPDATED = 'updateCard',
  CARD_DELETED = 'deleteCard',
  CARD_COMMENT_ADDED = 'commentCard',
  // CARD_COMMENT_REMOVED = 'deleteComment',

  CARD_ATTACHMENT_ADDED = 'addAttachmentToCard',
  CARD_ATTACHMENT_REMOVED = 'deleteAttachmentFromCard',

  CARD_LABEL_ADDED = 'addLabelToCard',
  CARD_LABEL_REMOVED = 'removeLabelFromCard',

  CARD_CHECKLIST_ADDED = 'addChecklistToCard',

  //unknown action detailed type, separate handler
  CHECKLIST_ITEM_CREATED = 'createCheckItem',

  CHECKLIST_COPY = 'copyChecklist',
  CHECKLIST_ITEM_DUE_DATE_UPDATED = 'updateCheckItemDue',
  CHECKLIST_ITEM_STATE_UPDATED = 'updateCheckItemStateOnCard',
  CHECKLIST_ITEM_MEMBER_UPDATED = 'updateMemberOnCheckItem',
  CHECKLIST_ITEM_CONVERTED_TO_CARD = 'convertToCardFromCheckItem',
  CHECKLIST_DELETED_FROM_CARD = 'removeChecklistFromCard',

  LIST_CREATED = 'createList',
  LIST_UPDATED = 'updateList',

  BOARD_MEMBER_REMOVED = 'removeMemberFromBoard',
  BOARD_MEMBER_ADDED = 'addMemberToBoard',
  BOARD_ADMIN_ADDED = 'makeAdminOfBoard',
  BOARD_MEMBER_NORMAL_ROLE_ADDED = 'makeNormalMemberOfBoard',
  BOARD_UPDATED = 'updateBoard',
  BOARD_DELETED = 'removeFromOrganizationBoard',

  CUSTOM_FIELD_CREATED = 'createCustomField',
  CUSTOM_FIELD_ITEM_UPDATED = 'updateCustomFieldItem',
  CUSTOM_FIELD_DELETED = 'deleteCustomField',
}

export enum TrelloWebhookDetailedActions {
  // CARD_CREATED = 'action_create_card',
  CARD_RENAMED = 'action_renamed_card',
  CARD_ARCHIVED = 'action_archived_card',
  // CARD_DELETED = 'action_delete_card',
  // CARD_DESCRIPTION_CHANGED = 'action_changed_description_of_card',
  CARD_MEMBER_ADDED = 'action_added_member_to_card',
  CARD_MEMBER_REMOVED = 'action_removed_member_from_card',
  CARD_MEMBER_JOINED = 'action_member_joined_card',
  CARD_MEMBER_LEFT = 'action_member_left_card',

  CARD_COMMENT_ADDED = 'action_comment_on_card',
  CARD_ATTACHMENT_ADDED = 'action_add_attachment_to_card',
  CARD_DUE_DATE_ADDED = 'action_added_a_due_date',
  CARD_DUE_DATE_CHANGED = 'action_changed_a_due_date',
  CARD_DUE_DATE_REMOVED = 'action_removed_a_due_date',

  CARD_START_DATE_ADDED = 'action_added_a_start_date',
  CARD_START_DATE_CHANGED = 'action_changed_a_start_date',
  CARD_START_DATE_REMOVED = 'action_removed_a_start_date',

  CARD_MOVED_TO_LIST = 'action_move_card_from_list_to_list',

  // CARD_MOVED_LOWER = 'action_moved_card_lower',
  // CARD_MOVED_HIGHER = 'action_moved_card_higher',

  CARD_LABEL_ADDED = 'action_add_label_to_card',
  CARD_LABEL_REMOVED = 'action_remove_label_from_card',

  CARD_CHECKLIST_ADDED = 'action_add_checklist_to_card',
  CARD_CHECKLIST_REMOVED = 'action_remove_checklist_from_card',
  CHECKLIST_ITEM_DELETED = 'action_deleted_checkitem',

  // there is no translationKey (detailed action type) for this action, it is hardcoded from generalType
  CHECKLIST_ITEM_ADDED = TrelloWebhookActions.CHECKLIST_ITEM_CREATED,

  //this 4 actions does not have target member even though it is related to certain user
  CHECKLIST_ITEM_MEMBER_ADDED = 'action_added_member_to_checkitem',
  CHECKLIST_ITEM_MEMBER_REMOVED = 'action_removed_member_from_checkitem',
  CHECKLIST_ITEM_MEMBER_JOINED = 'action_member_joined_checkitem',
  CHECKLIST_ITEM_MEMBER_LEFT = 'action_member_left_checkitem',

  CHECKLIST_ITEM_DUE_DATE_DELETED = 'action_delete_checkitem_due',
  CHECKLIST_ITEM_DUE_DATE_UPDATED = 'action_update_checkitem_due',
  CHECKLIST_ITEM_STATE_CHANGED_COMPLETED = 'action_completed_checkitem',
  CHECKLIST_ITEM_STATE_CHANGED_INCOMPLETED = 'action_marked_checkitem_incomplete',
  CHECKLIST_ITEM_CONVERTED_TO_CARD = 'action_convert_to_card_from_checkitem',

  LIST_CREATED = 'action_added_list_to_board',
  // LIST_MOVED_LEFT = 'action_moved_list_left',
  // LIST_MOVED_RIGHT = 'action_moved_list_right',
  LIST_ARCHIVED = 'action_archived_list',
  LIST_UNARCHIVED = 'action_sent_list_to_board',
  LIST_RENAMED = 'action_renamed_list',
  LIST_DELETED = 'action_deleted_list',

  BOARD_RENAMED = 'action_update_board_name',
  BOARD_MEMBER_REMOVED = 'action_removed_from_board',
  BOARD_MEMBER_INVITATION_JOINED = 'action_joined_board_by_invitation_link',
  BOARD_MEMBER_LEFT = 'action_left_board',
  BOARD_MEMBER_JOINED = 'action_joined_board',
  BOARD_ADMIN_ADDED = 'action_made_admin_of_board',
  BOARD_MEMBER_NORMAL_ROLE_ADDED = 'action_made_a_normal_user_on',
  BOARD_MEMBER_NORMAL_ROLE_BECAME = 'action_became_a_normal_user_on',
  BOARD_CLOSED = 'action_closed_board',
  BOARD_REOPENED = 'action_reopened_board',
  BOARD_PERM_LEVEL_CHANGED = 'action_board_perm_level',
  // BOARD_DELETED = 'action_remove_from_organization_board',

  CUSTOM_FIELD_CREATED = 'action_create_custom_field',
  // CUSTOM_FIELD_UPDATED = 'action_update_custom_field',
  CUSTOM_FIELD_ITEM_UPDATED = 'action_update_custom_field_item',
  CUSTOM_FIELD_RENAMED = 'action_rename_custom_field',
  CUSTOM_FIELD_DELETED = 'action_delete_custom_field',
}

export enum TrelloWebhookPersonalActions {
  CARD_MEMBER_ADDED = TrelloWebhookDetailedActions.CARD_MEMBER_ADDED,
  CARD_MEMBER_REMOVED = TrelloWebhookDetailedActions.CARD_MEMBER_REMOVED,

  CHECKLIST_ITEM_MEMBER_ADDED = TrelloWebhookDetailedActions.CHECKLIST_ITEM_MEMBER_ADDED,
  CHECKLIST_ITEM_MEMBER_REMOVED = TrelloWebhookDetailedActions.CHECKLIST_ITEM_MEMBER_REMOVED,

  BOARD_ADMIN_ADDED = TrelloWebhookDetailedActions.BOARD_ADMIN_ADDED,

  BOARD_MEMBER_NORMAL_ROLE_ADDED = TrelloWebhookDetailedActions.BOARD_MEMBER_NORMAL_ROLE_ADDED,
  BOARD_MEMBER_REMOVED = TrelloWebhookDetailedActions.BOARD_MEMBER_REMOVED,
}

export enum TrelloWebhookCardActions {
  CARD_RENAMED = TrelloWebhookDetailedActions.CARD_RENAMED,
  CARD_ARCHIVED = TrelloWebhookDetailedActions.CARD_ARCHIVED,

  //we receive only id of deleted card on this action
  // CARD_DELETED = TrelloWebhookDetailedActions.CARD_DELETED,

  CARD_MEMBER_ADDED = TrelloWebhookDetailedActions.CARD_MEMBER_ADDED,
  CARD_MEMBER_REMOVED = TrelloWebhookDetailedActions.CARD_MEMBER_REMOVED,
  CARD_MEMBER_JOINED = TrelloWebhookDetailedActions.CARD_MEMBER_JOINED,
  CARD_MEMBER_LEFT = TrelloWebhookDetailedActions.CARD_MEMBER_LEFT,

  CARD_DUE_DATE_ADDED = TrelloWebhookDetailedActions.CARD_DUE_DATE_ADDED,
  CARD_DUE_DATE_CHANGED = TrelloWebhookDetailedActions.CARD_DUE_DATE_CHANGED,
  CARD_START_DATE_ADDED = TrelloWebhookDetailedActions.CARD_START_DATE_ADDED,
  CARD_START_DATE_CHANGED = TrelloWebhookDetailedActions.CARD_START_DATE_CHANGED,

  CARD_LABEL_ADDED = TrelloWebhookDetailedActions.CARD_LABEL_ADDED,
  CARD_LABEL_REMOVED = TrelloWebhookDetailedActions.CARD_LABEL_REMOVED,

  CARD_COMMENT_ADDED = TrelloWebhookDetailedActions.CARD_COMMENT_ADDED,
  CARD_ATTACHMENT_ADDED = TrelloWebhookDetailedActions.CARD_ATTACHMENT_ADDED,

  CARD_CHECKLIST_ADDED = TrelloWebhookDetailedActions.CARD_CHECKLIST_ADDED,
  CARD_CHECKLIST_REMOVED = TrelloWebhookDetailedActions.CARD_CHECKLIST_REMOVED,

  CHECKLIST_ITEM_ADDED = TrelloWebhookDetailedActions.CHECKLIST_ITEM_ADDED,
  CHECKLIST_ITEM_DELETED = TrelloWebhookDetailedActions.CHECKLIST_ITEM_DELETED,
  CHECKLIST_ITEM_MEMBER_ADDED = TrelloWebhookDetailedActions.CHECKLIST_ITEM_MEMBER_ADDED,
  CHECKLIST_ITEM_MEMBER_REMOVED = TrelloWebhookDetailedActions.CHECKLIST_ITEM_MEMBER_REMOVED,
  CHECKLIST_ITEM_MEMBER_JOINED = TrelloWebhookDetailedActions.CHECKLIST_ITEM_MEMBER_JOINED,
  CHECKLIST_ITEM_MEMBER_LEFT = TrelloWebhookDetailedActions.CHECKLIST_ITEM_MEMBER_LEFT,
  CHECKLIST_ITEM_DUE_DATE_UPDATED = TrelloWebhookDetailedActions.CHECKLIST_ITEM_DUE_DATE_UPDATED,
  CHECKLIST_ITEM_DUE_DATE_DELETED = TrelloWebhookDetailedActions.CHECKLIST_ITEM_DUE_DATE_DELETED,
  CHECKLIST_ITEM_STATE_CHANGED_COMPLETED = TrelloWebhookDetailedActions.CHECKLIST_ITEM_STATE_CHANGED_COMPLETED,
  CHECKLIST_ITEM_STATE_CHANGED_INCOMPLETED = TrelloWebhookDetailedActions.CHECKLIST_ITEM_STATE_CHANGED_INCOMPLETED,

  CHECKLIST_ITEM_CONVERTED_TO_CARD = TrelloWebhookDetailedActions.CHECKLIST_ITEM_CONVERTED_TO_CARD,

  CUSTOM_FIELD_ITEM_UPDATED = TrelloWebhookDetailedActions.CUSTOM_FIELD_ITEM_UPDATED,

  CARD_MOVED_TO_LIST = TrelloWebhookDetailedActions.CARD_MOVED_TO_LIST,
}

export enum TrelloWebhookBoardActions {
  BOARD_RENAMED = TrelloWebhookDetailedActions.BOARD_RENAMED,
  BOARD_CLOSED = TrelloWebhookDetailedActions.BOARD_CLOSED,
  BOARD_REOPENED = TrelloWebhookDetailedActions.BOARD_REOPENED,
  // BOARD_DELETED = TrelloWebhookDetailedActions.BOARD_DELETED,
  BOARD_MEMBER_INVITATION_JOINED = TrelloWebhookDetailedActions.BOARD_MEMBER_INVITATION_JOINED,
  BOARD_MEMBER_JOINED = TrelloWebhookDetailedActions.BOARD_MEMBER_JOINED,
  BOARD_MEMBER_LEFT = TrelloWebhookDetailedActions.BOARD_MEMBER_LEFT,
  BOARD_MEMBER_REMOVED = TrelloWebhookDetailedActions.BOARD_MEMBER_REMOVED,

  BOARD_MEMBER_NORMAL_ROLE_ADDED = TrelloWebhookDetailedActions.BOARD_MEMBER_NORMAL_ROLE_ADDED,
  BOARD_MEMBER_NORMAL_ROLE_BECAME = TrelloWebhookDetailedActions.BOARD_MEMBER_NORMAL_ROLE_BECAME,

  BOARD_ADMIN_ADDED = TrelloWebhookDetailedActions.BOARD_ADMIN_ADDED,
  BOARD_PERM_LEVEL_CHANGED = TrelloWebhookDetailedActions.BOARD_PERM_LEVEL_CHANGED,

  CUSTOM_FIELD_CREATED = TrelloWebhookDetailedActions.CUSTOM_FIELD_CREATED,
  // CUSTOM_FIELD_UPDATED = TrelloWebhookDetailedActions.CUSTOM_FIELD_UPDATED,
  CUSTOM_FIELD_RENAMED = TrelloWebhookDetailedActions.CUSTOM_FIELD_RENAMED,
  CUSTOM_FIELD_DELETED = TrelloWebhookDetailedActions.CUSTOM_FIELD_DELETED,
}

export enum TrelloWebhookListActions {
  LIST_CREATED = TrelloWebhookDetailedActions.LIST_CREATED,
  // LIST_MOVED_LEFT = 'action_moved_list_left',
  // LIST_MOVED_RIGHT = 'action_moved_list_right',
  LIST_ARCHIVED = TrelloWebhookDetailedActions.LIST_ARCHIVED,
  LIST_UNARCHIVED = TrelloWebhookDetailedActions.LIST_UNARCHIVED,
  LIST_RENAMED = TrelloWebhookDetailedActions.LIST_RENAMED,
  LIST_DELETED = TrelloWebhookDetailedActions.LIST_DELETED,
}

export enum TrelloWebhookNotificationCategories {
  CARD = 'card',
  LIST = 'list',
  BOARD = 'board',
  PERSONAL = 'personal',
}

export enum TrelloWebhookNotificationProfiles {
  BASIC = 'basic',
  ADVANCED = 'advanced',
  FULL = 'full',
  CUSTOM = 'custom',
}
