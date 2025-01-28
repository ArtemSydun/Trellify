export enum I18nKeys {
  // Email Messages
  MESSAGES_EMAIL_REGISTRATION_EMAIL_SUBJECT = 'common.messages.email.registrationEmailSubject',
  MESSAGES_EMAIL_REGISTRATION_EMAIL_MESSAGE = 'common.messages.email.registrationEmailMessage',
  MESSAGES_EMAIL_REGISTRATION_EMAIL_SENT_MESSAGE = 'common.messages.email.registrationEmailSentMessage',

  // Telegram Notifications
  MESSAGES_TELEGRAM_CONNECTION_MESSAGE = 'common.messages.telegram.connectionMessage',
  MESSAGES_TELEGRAM_DISCONNECTION_MESSAGE = 'common.messages.telegram.disconnectionMessage',

  //Telegram bot responses
  MESSAGES_TELEGRAM_NOTIFICATIONS_CONNECTED = 'common.messages.telegram.notificationsConnected',
  MESSAGES_TELEGRAM_NOTIFICATIONS_DISCONNECTED = 'common.messages.telegram.notificationsDisconnected',
  MESSAGES_TELEGRAM_GREETINGS_MESSAGE = 'common.messages.telegram.greetingsMessage',
  MESSAGES_TELEGRAM_AUTHORIZE_THROUGH_WEBSITE = 'common.messages.telegram.authorizeThroughWebsite',
  MESSAGES_TELEGRAM_HELP_INTRO_MESSAGE = 'common.messages.telegram.help.introMessage',
  MESSAGES_TELEGRAM_HELP_STEPS = 'common.messages.telegram.help.steps',
  MESSAGES_TELEGRAM_HELP_CLOSING = 'common.messages.telegram.help.closingMessage',

  // user related messages
  MESSAGES_USER_DELETED = 'common.messages.user.deleted',
  MESSAGES_USER_ALL_WEBHOOKS_DISCONNECTED = 'common.messages.user.allWebhooksDisconnected',

  // Webhook Messages
  MESSAGES_TRELLO_WEBHOOK_HEALTH_IS_OK = 'common.messages.trello.webhook.webhookHealthIsOk',
  MESSAGES_TRELLO_WEBHOOK_WAS_RECREATED = 'common.messages.trello.webhook.webhookWasRecreated',
  MESSAGES_TRELLO_WEBHOOKS_WAS_UPDATED = 'common.messages.trello.webhook.webhooksWasUpdated',

  // JWT Errors
  ERRORS_JWT_INVALID_TOKEN = 'common.errors.jwt.invalidToken',

  // User Errors
  ERRORS_USER_NOT_FOUND_BY_EMAIL = 'common.errors.user.notFoundByEmail',
  ERRORS_USER_ALREADY_EXIST = 'common.errors.user.alreadyExist',
  ERRORS_USER_NOT_FOUND_BY_ID = 'common.errors.user.notFoundById',
  ERRORS_USER_NOT_FOUND_BY_TRELLO_ID = 'common.errors.user.notFoundByTrelloId',
  ERRORS_USER_NOT_FOUND_BY_PROPERTY = 'common.errors.user.notFoundByProperty',

  // Telegram Errors
  ERRORS_TELEGRAM_BOT_ALREADY_CONNECTED = 'common.errors.telegram.botAlreadyConnected',
  ERRORS_TELEGRAM_PROFILE_NOT_FOUND = 'common.errors.telegram.profileNotFound',

  // Trello Errors
  ERRORS_TRELLO_WEBHOOKS_BULK_FAIL = 'common.errors.trello.webhook.failedToUpdateWebhooks',
  ERRORS_TRELLO_YOU_ARE_NOT_CONNECTED_TO_WEBHOOK = 'common.errors.trello.webhook.youAreNotConnectedToWebhook',
  ERRORS_TRELLO_USER_IS_NOT_CONNECTED_TO_WEBHOOK = 'common.errors.trello.webhook.userIsNotConnectedToWebhook',
  ERRORS_TRELLO_WEBHOOK_IS_ALREADY_EXIST = 'common.errors.trello.webhook.webhookIsAlreadyExist',
  ERRORS_TRELLO_WEBHOOK_NOT_FOUND_BY_BOARD_ID = 'common.errors.trello.webhook.webhookNotFoundByBoardId',
  ERRORS_TRELLO_WEBHOOK_NOT_FOUND_BY_ID = 'common.errors.trello.webhook.webhookNotFoundById',
  ERRORS_TRELLO_INVALID_ENTITY_ID = 'common.errors.trello.invalidEntityId',
  ERRORS_TRELLO_WEBHOOKS_DISCONNECT = 'common.errors.trello.webhook.webhooksDisconnect',
  ERRORS_TRELLO_INVALID_TOKEN = 'common.errors.trello.profile.invalidToken',
  ERRORS_TRELLO_INVALID_APP_KEY = 'common.errors.trello.profile.invalidAppKey',
  ERRORS_TRELLO_INVALID_WEBHOOK_ID = 'common.errors.trello.webhook.invalidWebhookId',
  ERRORS_TRELLO_CHECK_CONNECTION = 'common.errors.trello.profile.checkConnection',
  ERRORS_TRELLO_EXPIRED_TOKEN = 'common.errors.trello.profile.expiredToken',
  ERRORS_TRELLO_ALREADY_CONNECTED = 'common.errors.trello.profile.alreadyConnected',

  // General Errors
  ERRORS_GENERAL_INVALID_REQUEST = 'common.errors.general.invalidRequest',
  ERRORS_GENERAL_INVALID_CREDENTIALS = 'common.errors.general.invalidCredentials',
  ERRORS_GENERAL_FORBIDDEN_RESOURCE = 'common.errors.general.forbiddenResource',

  // Auth Errors
  ERRORS_AUTH_RESET_PASSWORD_MISMATCH = 'common.errors.auth.resetPasswordMismatch',

  // Telegram User Notification
  NOTIFICATION_TELEGRAM_PERSONAL_CARD_MEMBER_ADDED = 'common.messages.telegram.notifications.personal.cardMemberAddedSelf',
  NOTIFICATION_TELEGRAM_PERSONAL_CARD_MEMBER_REMOVED = 'common.messages.telegram.notifications.personal.cardMemberRemovedSelf',
  NOTIFICATION_TELEGRAM_PERSONAL_CHECKLIST_ITEM_MEMBER_ADDED = 'common.messages.telegram.notifications.personal.checklistItemMemberAddedSelf',
  NOTIFICATION_TELEGRAM_PERSONAL_CHECKLIST_ITEM_MEMBER_REMOVED = 'common.messages.telegram.notifications.personal.checklistItemMemberRemovedSelf',
  NOTIFICATION_TELEGRAM_PERSONAL_BOARD_ADMIN_ADDED = 'common.messages.telegram.notifications.personal.boardAdminAddedSelf',
  NOTIFICATION_TELEGRAM_PERSONAL_BOARD_MEMBER_REMOVED = 'common.messages.telegram.notifications.personal.boardMemberRemovedSelf',

  NOTIFICATION_TELEGRAM_BOARD_RENAMED = 'common.messages.telegram.notifications.board.boardRenamed',
  NOTIFICATION_TELEGRAM_BOARD_CLOSED = 'common.messages.telegram.notifications.board.boardClosed',
  NOTIFICATION_TELEGRAM_BOARD_REOPENED = 'common.messages.telegram.notifications.board.boardReopened',

  NOTIFICATION_TELEGRAM_CARD_RENAMED = 'common.messages.telegram.notifications.card.cardRenamed',
  NOTIFICATION_TELEGRAM_CARD_ARCHIVED = 'common.messages.telegram.notifications.card.cardArchived',
  NOTIFICATION_TELEGRAM_CARD_MEMBER_ADDED = 'common.messages.telegram.notifications.card.cardMemberAdded',
  NOTIFICATION_TELEGRAM_CARD_MEMBER_REMOVED = 'common.messages.telegram.notifications.card.cardMemberRemoved',
  NOTIFICATION_TELEGRAM_CARD_MEMBER_JOINED = 'common.messages.telegram.notifications.card.cardMemberJoined',
  NOTIFICATION_TELEGRAM_CARD_MEMBER_LEFT = 'common.messages.telegram.notifications.card.cardMemberLeft',
  NOTIFICATION_TELEGRAM_CARD_DUE_DATE_ADDED = 'common.messages.telegram.notifications.card.cardDueDateAdded',
  NOTIFICATION_TELEGRAM_CARD_DUE_DATE_CHANGED = 'common.messages.telegram.notifications.card.cardDueDateChanged',
  NOTIFICATION_TELEGRAM_CARD_START_DATE_ADDED = 'common.messages.telegram.notifications.card.cardStartDateAdded',
  NOTIFICATION_TELEGRAM_CARD_START_DATE_CHANGED = 'common.messages.telegram.notifications.card.cardStartDateChanged',
  NOTIFICATION_TELEGRAM_CARD_LABEL_ADDED = 'common.messages.telegram.notifications.card.cardLabelAdded',
  NOTIFICATION_TELEGRAM_CARD_LABEL_REMOVED = 'common.messages.telegram.notifications.card.cardLabelRemoved',
  NOTIFICATION_TELEGRAM_CARD_COMMENT_ADDED = 'common.messages.telegram.notifications.card.cardCommentAdded',
  NOTIFICATION_TELEGRAM_CARD_ATTACHMENT_ADDED = 'common.messages.telegram.notifications.card.cardAttachmentAdded',
  NOTIFICATION_TELEGRAM_CARD_CHECKLIST_ADDED = 'common.messages.telegram.notifications.card.cardChecklistAdded',
  NOTIFICATION_TELEGRAM_CARD_CHECKLIST_REMOVED = 'common.messages.telegram.notifications.card.cardChecklistRemoved',
  NOTIFICATION_TELEGRAM_CHECKLIST_ITEM_ADDED = 'common.messages.telegram.notifications.card.checklistItemAdded',
  NOTIFICATION_TELEGRAM_CHECKLIST_ITEM_DELETED = 'common.messages.telegram.notifications.card.checklistItemDeleted',
  NOTIFICATION_TELEGRAM_CHECKLIST_ITEM_MEMBER_ADDED = 'common.messages.telegram.notifications.card.checklistItemMemberAdded',
  NOTIFICATION_TELEGRAM_CHECKLIST_ITEM_MEMBER_REMOVED = 'common.messages.telegram.notifications.card.checklistItemMemberRemoved',
  NOTIFICATION_TELEGRAM_CHECKLIST_ITEM_MEMBER_JOINED = 'common.messages.telegram.notifications.card.checklistItemMemberJoined',
  NOTIFICATION_TELEGRAM_CHECKLIST_ITEM_MEMBER_LEFT = 'common.messages.telegram.notifications.card.checklistItemMemberLeft',
  NOTIFICATION_TELEGRAM_CHECKLIST_ITEM_DUE_DATE_UPDATED = 'common.messages.telegram.notifications.card.checklistItemDueDateUpdated',
  NOTIFICATION_TELEGRAM_CHECKLIST_ITEM_DUE_DATE_DELETED = 'common.messages.telegram.notifications.card.checklistItemDueDateDeleted',
  NOTIFICATION_TELEGRAM_CHECKLIST_ITEM_STATE_CHANGED_COMPLETED = 'common.messages.telegram.notifications.card.checklistItemCompleted',
  NOTIFICATION_TELEGRAM_CHECKLIST_ITEM_STATE_CHANGED_INCOMPLETED = 'common.messages.telegram.notifications.card.checklistItemIncompleted',
  NOTIFICATION_TELEGRAM_CHECKLIST_ITEM_CONVERTED_TO_CARD = 'common.messages.telegram.notifications.card.checklistItemConvertedToCard',
  NOTIFICATION_TELEGRAM_CUSTOM_FIELD_ITEM_UPDATED = 'common.messages.telegram.notifications.card.customFieldItemUpdated',
  NOTIFICATION_TELEGRAM_CARD_MOVED_TO_LIST = 'common.messages.telegram.notifications.card.cardMovedToList',

  NOTIFICATION_TELEGRAM_BOARD_MEMBER_INVITATION_JOINED = 'common.messages.telegram.notifications.admin.boardMemberInvitationJoined',
  NOTIFICATION_TELEGRAM_BOARD_MEMBER_JOINED = 'common.messages.telegram.notifications.admin.boardMemberJoined',
  NOTIFICATION_TELEGRAM_BOARD_MEMBER_LEFT = 'common.messages.telegram.notifications.admin.boardMemberLeft',
  NOTIFICATION_TELEGRAM_BOARD_MEMBER_REMOVED = 'common.messages.telegram.notifications.admin.boardMemberRemoved',
  NOTIFICATION_TELEGRAM_BOARD_MEMBER_NORMAL_ROLE_ADDED = 'common.messages.telegram.notifications.admin.boardNormalRoleAdded',
  NOTIFICATION_TELEGRAM_BOARD_ADMIN_ADDED = 'common.messages.telegram.notifications.admin.boardAdminAdded',
  NOTIFICATION_TELEGRAM_CUSTOM_FIELD_CREATED = 'common.messages.telegram.notifications.admin.customFieldCreated',
  NOTIFICATION_TELEGRAM_CUSTOM_FIELD_RENAMED = 'common.messages.telegram.notifications.admin.customFieldRenamed',
  NOTIFICATION_TELEGRAM_CUSTOM_FIELD_DELETED = 'common.messages.telegram.notifications.admin.customFieldDeleted',
  NOTIFICATION_TELEGRAM_BOARD_PERM_LEVEL_CHANGED = 'common.messages.telegram.notifications.admin.boardPermLevelChanged',
}
