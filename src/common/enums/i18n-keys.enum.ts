export enum I18nKeys {
  // field names
  FIELDS_AUTHOR = 'common.fields.author',
  FIELDS_TARGET = 'common.fields.target',
  FIELDS_BOARD = 'common.fields.board',
  FIELDS_CARD = 'common.fields.card',
  FIELDS_DATE = 'common.fields.date',
  FIELDS_SETTINGS = 'common.fields.settings',
  FIELDS_DASHBOARD = 'common.fields.dashboard',

  //Notification status
  MESSAGES_GENERAL_CONNECTION_MESSAGE = 'common.messages.general.connectionMessage',
  MESSAGES_GENERAL_DISCONNECTION_MESSAGE = 'common.messages.general.disconnectionMessage',

  //Bot responses
  MESSAGES_GENERAL_NOTIFICATIONS_CONNECTED = 'common.messages.general.notificationsConnected',
  MESSAGES_GENERAL_NOTIFICATIONS_DISCONNECTED = 'common.messages.general.notificationsDisconnected',
  MESSAGES_GENERAL_GREETINGS_MESSAGE = 'common.messages.general.greetingsMessage',
  MESSAGES_GENERAL_AUTHORIZE_THROUGH_WEBSITE = 'common.messages.general.authorizeThroughWebsite',
  MESSAGES_GENERAL_PROFILE_FOUND = 'common.messages.general.profileFound',
  MESSAGES_GENERAL_HELP_INTRO_MESSAGE = 'common.messages.general.help.introMessage',
  MESSAGES_GENERAL_HELP_STEPS = 'common.messages.general.help.steps',
  MESSAGES_GENERAL_HELP_CLOSING = 'common.messages.general.help.closingMessage',

  // Email Messages
  MESSAGES_EMAIL_REGISTRATION_EMAIL_SUBJECT = 'common.messages.email.registrationEmailSubject',
  MESSAGES_EMAIL_REGISTRATION_EMAIL_MESSAGE = 'common.messages.email.registrationEmailMessage',
  MESSAGES_EMAIL_REGISTRATION_EMAIL_SENT_MESSAGE = 'common.messages.email.registrationEmailSentMessage',
  MESSAGES_EMAIL_RESET_PASSWORD_SUBJECT = 'common.messages.email.resetPasswordEmailSubject',
  MESSAGES_EMAIL_RESET_PASSWORD_MESSAGE = 'common.messages.email.resetPasswordEmailMessage',
  MESSAGES_EMAIL_RESET_PASSWORD_SENT_MESSAGE = 'common.messages.email.resetPasswordEmailSentMessage',
  MESSAGES_EMAIL_DELETE_USER_SUBJECT = 'common.messages.email.deleteUserEmailSubject',
  MESSAGES_EMAIL_DELETE_USER_MESSAGE = 'common.messages.email.deleteUserEmailMessage',
  MESSAGES_EMAIL_DELETE_USER_SENT_MESSAGE = 'common.messages.email.deleteUserEmailSentMessage',
  MESSAGES_EMAIL_CHANGE_MAIL_SUBJECT = 'common.messages.email.changeMailEmailSubject',
  MESSAGES_EMAIL_CHANGE_MAIL_MESSAGE = 'common.messages.email.changeMailEmailMessage',
  MESSAGES_EMAIL_CHANGE_MAIL_SENT_MESSAGE = 'common.messages.email.changeMailEmailSentMessage',
  MESSAGES_EMAIL_CONTACT_US_EMAIL_SENT_MESSAGE = 'common.messages.email.contactUsEmailSentMessage',
  MESSAGES_EMAIL_IGNORE_EMAIL_DEFAULT_MESSAGE = 'common.messages.email.ignoreEmailDefaultMessage',
  MESSAGES_EMAIL_LINK_AVAILABLE_DEFAULT_MESSAGE = 'common.messages.email.linkAvailableDefaultMessage',

  // user related messages
  MESSAGES_USER_CREATED = 'common.messages.user.created',
  MESSAGES_USER_UPDATED = 'common.messages.user.updated',
  MESSAGES_USER_DELETED = 'common.messages.user.deleted',
  MESSAGES_USER_SUBSCRIPTION_UPDATED = 'common.messages.user.subscriptionUpdated',

  MESSAGES_USER_ALL_WEBHOOKS_DISCONNECTED = 'common.messages.user.allWebhooksDisconnected',
  MESSAGES_USER_PASSWORD_CHANGED_SUCCESSFULLY = 'common.messages.user.passwordChangedSuccessfully',
  MESSAGES_USER_EMAIL_CHANGED_SUCCESSFULLY = 'common.messages.user.emailChangedSuccessfully',

  //Telegram
  MESSAGES_TELEGRAM_CONNECTED_SUCCESSFULLY = 'common.messages.telegram.connectedSuccessfully',
  MESSAGES_TELEGRAM_DISCONNECTED_SUCCESSFULLY = 'common.messages.telegram.disconnectedSuccessfully',
  MESSAGES_TELEGRAM_DISCONNECT_CONFIRMATION = 'common.messages.telegram.disconnectConfirmation',

  //Discord
  MESSAGES_DISCORD_CONNECTED_SUCCESSFULLY = 'common.messages.discord.connectedSuccessfully',
  MESSAGES_DISCORD_DISCONNECTED_SUCCESSFULLY = 'common.messages.discord.disconnectedSuccessfully',
  MESSAGES_DISCORD_DISCONNECT_CONFIRMATION = 'common.messages.discord.disconnectConfirmation',

  // Webhook Messages
  MESSAGES_TRELLO_WEBHOOK_HEALTH_IS_OK = 'common.messages.trello.webhook.webhookHealthIsOk',
  MESSAGES_TRELLO_WEBHOOK_WAS_RECREATED = 'common.messages.trello.webhook.webhookWasRecreated',
  MESSAGES_TRELLO_WEBHOOKS_WAS_UPDATED = 'common.messages.trello.webhook.webhooksWasUpdated',

  //Subscriptions messages
  MESSAGES_SUBSCRIPTION_EXPIRING = 'common.messages.subscription.expiring',
  MESSAGES_SUBSCRIPTION_CREATED_SUCCESSFULLY = 'common.messages.subscription.createdSuccessfully',
  MESSAGES_SUBSCRIPTION_UPDATED_SUCCESSFULLY = 'common.messages.subscription.updatedSuccessfully',
  MESSAGES_SUBSCRIPTION_DELETED_SUCCESSFULLY = 'common.messages.subscription.deletedSuccessfully',
  MESSAGES_SUBSCRIPTION_USER_CHANGED_SUCCESSFULLY = 'common.messages.subscription.userChangedSuccessfully',

  // Trello Notification Messages
  NOTIFICATION_PERSONAL_CARD_MEMBER_ADDED = 'common.messages.notifications.personal.cardMemberAddedSelf',
  NOTIFICATION_PERSONAL_CARD_MEMBER_REMOVED = 'common.messages.notifications.personal.cardMemberRemovedSelf',
  NOTIFICATION_PERSONAL_CHECKLIST_ITEM_MEMBER_ADDED = 'common.messages.notifications.personal.checklistItemMemberAddedSelf',
  NOTIFICATION_PERSONAL_CHECKLIST_ITEM_MEMBER_REMOVED = 'common.messages.notifications.personal.checklistItemMemberRemovedSelf',
  NOTIFICATION_PERSONAL_BOARD_ADMIN_ADDED = 'common.messages.notifications.personal.boardAdminAddedSelf',
  NOTIFICATION_PERSONAL_BOARD_NORMAL_ROLE_ADDED = 'common.messages.notifications.personal.boardNormalRoleAddedSelf',
  NOTIFICATION_PERSONAL_BOARD_MEMBER_REMOVED = 'common.messages.notifications.personal.boardMemberRemovedSelf',

  NOTIFICATION_CARD_CREATED = 'common.messages.notifications.card.cardCreated',
  NOTIFICATION_CARD_RENAMED = 'common.messages.notifications.card.cardRenamed',
  NOTIFICATION_CARD_ARCHIVED = 'common.messages.notifications.card.cardArchived',
  NOTIFICATION_CARD_UNARCHIVED = 'common.messages.notifications.card.cardUnarchived',
  NOTIFICATION_CARD_DELETED = 'common.messages.notifications.card.cardDeleted',

  NOTIFICATION_CARD_MEMBER_ADDED = 'common.messages.notifications.card.cardMemberAdded',
  NOTIFICATION_CARD_MEMBER_REMOVED = 'common.messages.notifications.card.cardMemberRemoved',
  NOTIFICATION_CARD_MEMBER_JOINED = 'common.messages.notifications.card.cardMemberJoined',
  NOTIFICATION_CARD_MEMBER_LEFT = 'common.messages.notifications.card.cardMemberLeft',

  NOTIFICATION_CARD_LABEL_ADDED = 'common.messages.notifications.card.cardLabelAdded',
  NOTIFICATION_CARD_LABEL_REMOVED = 'common.messages.notifications.card.cardLabelRemoved',

  NOTIFICATION_CARD_DESCRIPTION_CHANGED = 'common.messages.notifications.card.cardDescriptionChanged',
  NOTIFICATION_CARD_COMMENT_ADDED = 'common.messages.notifications.card.cardCommentAdded',

  NOTIFICATION_CARD_START_DATE_ADDED = 'common.messages.notifications.card.cardStartDateAdded',
  NOTIFICATION_CARD_START_DATE_CHANGED = 'common.messages.notifications.card.cardStartDateChanged',
  NOTIFICATION_CARD_START_DATE_REMOVED = 'common.messages.notifications.card.cardStartDateRemoved',

  NOTIFICATION_CARD_DUE_DATE_ADDED = 'common.messages.notifications.card.cardDueDateAdded',
  NOTIFICATION_CARD_DUE_DATE_CHANGED = 'common.messages.notifications.card.cardDueDateChanged',
  NOTIFICATION_CARD_DUE_DATE_REMOVED = 'common.messages.notifications.card.cardDueDateRemoved',
  NOTIFICATION_CARD_DUE_DATE_MARKED_COMPLETED = 'common.messages.notifications.card.cardDueDateMarkedCompleted',
  NOTIFICATION_CARD_DUE_DATE_MARKED_INCOMPLETED = 'common.messages.notifications.card.cardDueDateMarkedIncompleted',

  NOTIFICATION_CARD_ATTACHMENT_ADDED = 'common.messages.notifications.card.cardAttachmentAdded',
  NOTIFICATION_CARD_ATTACHMENT_REMOVED = 'common.messages.notifications.card.cardAttachmentRemoved',

  NOTIFICATION_CARD_CUSTOM_FIELD_UPDATED = 'common.messages.notifications.card.cardCustomFieldUpdated',

  NOTIFICATION_CARD_MOVED_FROM_BOARD = 'common.messages.notifications.card.cardMovedFromBoard',
  NOTIFICATION_CARD_MOVED_TO_BOARD = 'common.messages.notifications.card.cardMovedToBoard',
  NOTIFICATION_CARD_MOVED_TO_LIST = 'common.messages.notifications.card.cardMovedToList',

  NOTIFICATION_CHECKLIST_ADDED = 'common.messages.notifications.checklist.checklistAdded',
  NOTIFICATION_CHECKLIST_RENAMED = 'common.messages.notifications.checklist.checklistRenamed',
  NOTIFICATION_CHECKLIST_REMOVED = 'common.messages.notifications.checklist.checklistRemoved',

  NOTIFICATION_CHECKLIST_ITEM_ADDED = 'common.messages.notifications.checklist.checklistItemAdded',
  NOTIFICATION_CHECKLIST_ITEM_RENAMED = 'common.messages.notifications.checklist.checklistItemRenamed',
  NOTIFICATION_CHECKLIST_ITEM_DELETED = 'common.messages.notifications.checklist.checklistItemDeleted',

  NOTIFICATION_CHECKLIST_ITEM_MEMBER_ADDED = 'common.messages.notifications.checklist.checklistItemMemberAdded',
  NOTIFICATION_CHECKLIST_ITEM_MEMBER_REMOVED = 'common.messages.notifications.checklist.checklistItemMemberRemoved',
  NOTIFICATION_CHECKLIST_ITEM_MEMBER_JOINED = 'common.messages.notifications.checklist.checklistItemMemberJoined',
  NOTIFICATION_CHECKLIST_ITEM_MEMBER_LEFT = 'common.messages.notifications.checklist.checklistItemMemberLeft',

  NOTIFICATION_CHECKLIST_ITEM_DUE_DATE_UPDATED = 'common.messages.notifications.checklist.checklistItemDueDateUpdated',
  NOTIFICATION_CHECKLIST_ITEM_DUE_DATE_DELETED = 'common.messages.notifications.checklist.checklistItemDueDateDeleted',
  NOTIFICATION_CHECKLIST_ITEM_STATE_CHANGED_COMPLETED = 'common.messages.notifications.checklist.checklistItemCompleted',
  NOTIFICATION_CHECKLIST_ITEM_STATE_CHANGED_INCOMPLETED = 'common.messages.notifications.checklist.checklistItemIncompleted',
  NOTIFICATION_CHECKLIST_ITEM_CONVERTED_TO_CARD = 'common.messages.notifications.checklist.checklistItemConvertedToCard',

  NOTIFICATION_LIST_CREATED = 'common.messages.notifications.list.listCreated',
  NOTIFICATION_LIST_RENAMED = 'common.messages.notifications.list.listRenamed',
  NOTIFICATION_LIST_ARCHIVED = 'common.messages.notifications.list.listArchived',
  NOTIFICATION_LIST_UNARCHIVED = 'common.messages.notifications.list.listUnarchived',
  NOTIFICATION_LIST_DELETED = 'common.messages.notifications.list.listDeleted',

  NOTIFICATION_BOARD_RENAMED = 'common.messages.notifications.board.boardRenamed',
  NOTIFICATION_BOARD_PERM_LEVEL_CHANGED = 'common.messages.notifications.board.boardPermLevelChanged',
  NOTIFICATION_BOARD_CLOSED = 'common.messages.notifications.board.boardClosed',
  NOTIFICATION_BOARD_REOPENED = 'common.messages.notifications.board.boardReopened',
  NOTIFICATION_BOARD_MEMBER_JOINED = 'common.messages.notifications.board.boardMemberJoined',
  NOTIFICATION_BOARD_MEMBER_INVITATION_JOINED = 'common.messages.notifications.board.boardMemberInvitationJoined',
  NOTIFICATION_BOARD_MEMBER_LEFT = 'common.messages.notifications.board.boardMemberLeft',
  NOTIFICATION_BOARD_MEMBER_REMOVED = 'common.messages.notifications.board.boardMemberRemoved',
  NOTIFICATION_BOARD_ADMIN_ADDED = 'common.messages.notifications.board.boardAdminAdded',
  NOTIFICATION_BOARD_MEMBER_NORMAL_ROLE_ADDED = 'common.messages.notifications.board.boardNormalRoleAdded',
  NOTIFICATION_BOARD_MEMBER_NORMAL_ROLE_BECAME = 'common.messages.notifications.board.boardNormalRoleBecame',
  NOTIFICATION_CUSTOM_FIELD_CREATED = 'common.messages.notifications.board.customFieldCreated',
  NOTIFICATION_CUSTOM_FIELD_RENAMED = 'common.messages.notifications.board.customFieldRenamed',
  NOTIFICATION_CUSTOM_FIELD_DELETED = 'common.messages.notifications.board.customFieldDeleted',

  // General Errors
  ERRORS_GENERAL_DEFAULT = 'common.errors.general.default',
  ERRORS_GENERAL_INVALID_REQUEST = 'common.errors.general.invalidRequest',
  ERRORS_GENERAL_INVALID_CREDENTIALS = 'common.errors.general.invalidCredentials',
  ERRORS_GENERAL_FORBIDDEN_RESOURCE = 'common.errors.general.forbiddenResource',
  ERRORS_GENERAL_FAILED_SEND_EMAIL = 'common.errors.general.failedSendEmail',
  ERRORS_GENERAL_PROFILE_NOT_FOUND = 'common.errors.general.profileNotFound',
  ERRORS_GENERAL_ACTION_CANCELED = 'common.errors.general.actionCanceled',

  // JWT Errors
  ERRORS_JWT_INVALID_TOKEN = 'common.errors.jwt.invalidToken',

  // Auth Errors
  ERRORS_AUTH_RESET_PASSWORD_MISMATCH = 'common.errors.auth.resetPasswordMismatch',
  ERRORS_AUTH_CHANGE_PASSWORD_SAME_PASS = 'common.errors.auth.changePasswordSamePass',
  ERRORS_AUTH_CHANGE_EMAIL_SAME_ADRESS = 'common.errors.auth.changeEmailSameAdress',

  // User Errors
  ERRORS_USER_NOT_FOUND_BY_EMAIL = 'common.errors.user.notFoundByEmail',
  ERRORS_USER_ALREADY_EXIST = 'common.errors.user.alreadyExist',
  ERRORS_USER_NOT_FOUND_BY_ID = 'common.errors.user.notFoundById',
  ERRORS_USER_NOT_FOUND_BY_TRELLO_ID = 'common.errors.user.notFoundByTrelloId',
  ERRORS_USER_NOT_FOUND_BY_PROPERTY = 'common.errors.user.notFoundByProperty',

  // Telegram Errors
  ERRORS_TELEGRAM_BOT_ALREADY_CONNECTED = 'common.errors.telegram.botAlreadyConnected',
  ERRORS_TELEGRAM_BOT_IS_NOT_CONNECTED = 'common.errors.telegram.botIsNotConnected',
  ERRORS_TELEGRAM_RATE_LIMIT_EXCEEDED = 'common.errors.telegram.rateLimitExceeded',
  // Discord Errors
  ERRORS_DISCORD_BOT_ALREADY_CONNECTED = 'common.errors.discord.botAlreadyConnected',
  ERRORS_DISCORD_BOT_IS_NOT_CONNECTED = 'common.errors.discord.botIsNotConnected',

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
  ERRORS_TRELLO_UNATHORIZED_PERMISSION = 'common.errors.trello.webhook.unathorizedPermission',
  ERRORS_TRELLO_CHECK_CONNECTION = 'common.errors.trello.profile.checkConnection',
  ERRORS_TRELLO_EXPIRED_TOKEN = 'common.errors.trello.profile.expiredToken',
  ERRORS_TRELLO_DISCONNECT_FIRST = 'common.errors.trello.profile.disconnectFirst',
  ERRORS_TRELLO_ALREADY_CONNECTED = 'common.errors.trello.profile.alreadyConnected',

  // Subscription errors
  ERRORS_SUBSCRIPTION_HAS_SUBSCRIBERS = 'common.errors.subscription.hasSubscribers',
  ERRORS_SUBSCRIPTION_USER_NOT_SUBSCRIBED = 'common.errors.subscription.userNotSubscribed',
  ERRORS_SUBSCRIPTION_USER_ALREADY_SUBSCRIBED = 'common.errors.subscription.userAlreadySubscribed',
  ERRORS_SUBSCRIPTION_ALREADY_EXIST = 'common.errors.subscription.alreadyExist',
  ERRORS_SUBSCRIPTION_DOES_NOT_EXIST = 'common.errors.subscription.doesNotExist',
  ERRORS_SUBSCRIPTION_TRIAL_EXPIRED = 'common.errors.subscription.trialExpired',
}
