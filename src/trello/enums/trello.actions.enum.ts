// actions which are without proper "translationKey" (detailed action type)
// updateComment ("unknown"),  deleteComment ("unknown")
// some actions on updateCard ("unknown"), for example changing card color / deadline notification update / removing all labels from card
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
    // BOARD_UPDATED = 'updateBoard',
    // BOARD_DELETED = 'removeFromOrganizationBoard',

    CUSTOM_FIELD_CREATED = 'createCustomField',
    CUSTOM_FIELD_ITEM_UPDATED = 'updateCustomFieldItem',
}

export enum TrelloWebhookDetailedActions {
    // CARD_CREATED = 'action_create_card',
    CARD_RENAMED = 'action_renamed_card',
    CARD_ARCHIVED = 'action_archived_card',
    CARD_DELETED = 'action_delete_card',
    // CARD_DESCRIPTION_CHANGED = 'action_changed_description_of_card',
    CARD_MEMBER_ADDED = 'action_added_member_to_card',
    CARD_MEMBER_REMOVED = 'action_removed_member_from_card',
    // CARD_MEMBER_JOINED = 'action_member_joined_card',
    // CARD_MEMBER_LEFT = 'action_member_left_card',

    CARD_COMMENT_ADDED = 'action_comment_on_card',
    CARD_ATTACHMENT_ADDED = 'action_add_attachment_to_card',
    CARD_DUE_DATE_ADDED = 'action_added_a_due_date',
    CARD_DUE_DATE_CHANGED = 'action_changed_a_due_date',
    // CARD_DUE_DATE_REMOVED = 'action_removed_a_due_date',

    CARD_START_DATE_ADDED = 'action_added_a_start_date',
    CARD_START_DATE_CHANGED = 'action_changed_a_start_date',
    // CARD_START_DATE_REMOVED = 'action_removed_a_start_date',

    CARD_MOVED_TO_LIST = 'action_move_card_from_list_to_list',


    // CARD_MOVED_LOWER = 'action_moved_card_lower',
    // CARD_MOVED_HIGHER = 'action_moved_card_higher',

    CARD_LABEL_ADDED = 'action_add_label_to_card',
    CARD_LABEL_REMOVED = 'action_remove_label_from_card',

    CARD_CHECKLIST_ADDED = 'action_add_checklist_to_card',
    CARD_CHECKLIST_REMOVED = 'action_remove_checklist_from_card',
    CHECKLIST_ITEM_DELETED = 'action_deleted_checkitem',
    // CHECKLIST_ITEM_MEMBER_JOINED = 'action_member_joined_checkitem',
    // CHECKLIST_ITEM_MEMBER_LEFT = 'action_member_left_checkitem',
    
    // there is no translationKey (detailed action type) for this action, it is hardcoded from generalType
    CHECKLIST_ITEM_ADDED = 'createCheckItem',

    CHECKLIST_ITEM_MEMBER_ADDED = 'action_added_member_to_checkitem',
    CHECKLIST_ITEM_MEMBER_REMOVED = 'action_removed_member_from_checkitem',
    CHECKLIST_ITEM_DUE_DATE_DELETED = 'action_delete_checkitem_due',
    CHECKLIST_ITEM_DUE_DATE_UPDATED = 'action_update_checkitem_due',
    CHECKLIST_ITEM_STATE_CHANGED_COMPLETED = 'action_completed_checkitem',
    CHECKLIST_ITEM_STATE_CHANGED_INCOMPLETED = 'action_marked_checkitem_incomplete',
    CHECKLIST_ITEM_CONVERTED_TO_CARD = 'action_convert_to_card_from_checkitem',

    // LIST_CREATED = 'action_added_list_to_board',
    // LIST_MOVED_LEFT = 'action_moved_list_left',
    // LIST_MOVED_RIGHT = 'action_moved_list_right',
    // LIST_ARCHIVED = 'action_archived_list',
    // LIST_RENAMED = 'action_renamed_list',

    BOARD_MEMBER_REMOVED = 'action_removed_from_board',
    BOARD_MEMBER_INVITATION_JOINED = 'action_joined_board_by_invitation_link',
    BOARD_MEMBER_LEFT = 'action_left_board',
    BOARD_MEMBER_JOINED = 'action_joined_board',
    BOARD_ADMIN_ADDED = 'action_made_admin_of_board',
    BOARD_MEMBER_NORMAL_ROLE_ADDED = 'action_made_a_normal_user_on',
    // BOARD_CLOSED = 'action_closed_board',
    // BOARD_REOPENED = 'action_reopened_board',
    // BOARD_DELETED = 'action_remove_from_organization_board',

    CUSTOM_FIELD_CREATED = 'action_create_custom_field',
    CUSTOM_FIELD_UPDATED = 'action_update_custom_field',
    CUSTOM_FIELD_ITEM_UPDATED = 'action_update_custom_field_item',
}

export type NotificationType = {
    [key in TrelloWebhookDetailedActions]?: string[];
};
