export enum TrelloWebhookActions {
    REMOVE_MEMBER_FROM_CARD = 'removeMemberFromCard',
    ADD_MEMBER_TO_CARD = 'addMemberToCard',
    MOVE_CARD_FROM_BOARD = 'moveCardFromBoard',
    MOVE_CARD_TO_BOARD = 'moveCardToBoard',
    UPDATE_CARD = 'updateCard',
    COMMENT_CARD = 'commentCard',
    DELETE_COMMENT = 'deleteComment',

    ADD_ATTACHMENT_TO_CARD = 'addAttachmentToCard',
    DELETE_ATTACHMENT_FROM_CARD = 'deleteAttachmentFromCard',

    ADD_CHECKLIST = 'addChecklistToCard',
    CREATE_CHECKLIST_ITEM = 'createCheckItem',
    UPDATE_CHECKLIST_ITEM_DUE = 'updateCheckItemDue',
    UPDATE_CHECKLIST_ITEM_STATE = 'updateCheckItemStateOnCard',
    UPDATE_CHECKLIST_ITEM_MEMBER = 'updateMemberOnCheckItem',
}

export enum DetailedAction {
    CHANGED_CARD_DESCRIPTION = 'action_changed_description_of_card',
    RENAMED_CARD = 'action_renamed_card',

    COMMENTED_CARD = 'action_comment_on_card',
    ADDED_ATTACHMENT_TO_CARD = 'action_add_attachment_to_card',
    ADDED_DUE_DATE = 'action_added_a_due_date',
    CHANGED_DUE_DATE = 'action_changed_a_due_date',
    REMOVED_DUE_DATE = 'action_removed_a_due_date',

    ADDED_START_DATE = 'action_added_a_start_date',
    CHANGED_START_DATE = 'action_changed_a_start_date',
    REMOVED_START_DATE = 'action_removed_a_start_date',

    MOVED_CARD_TO_LIST = 'action_move_card_from_list_to_list',

    ADDED_CHECKLIST_TO_CARD = 'action_add_checklist_to_card',
    UPDATED_CHECKLIST_ITEM_DUE = 'action_update_checkitem_due',
    UPDATED_CHECKLIST_ITEM_MEMBER = 'action_member_joined_checkitem',
    REMOVED_CHECKLIST_ITEM_MEMBER = 'action_removed_member_from_checkitem',
    CHANGED_CHECKLIST_ITEM_STATE_COMPLETED = 'action_completed_checkitem',
    CHANGED_CHECKLIST_ITEM_STATE_INCOMPLETED = 'action_marked_checkitem_incomplete',
}