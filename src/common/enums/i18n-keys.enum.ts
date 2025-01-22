export enum I18nKeys {
  // Email Messages
  MESSAGES_EMAIL_REGISTRATION_EMAIL_SUBJECT = 'common.messages.email.registrationEmailSubject',
  MESSAGES_EMAIL_REGISTRATION_EMAIL_MESSAGE = 'common.messages.email.registrationEmailMessage',
  MESSAGES_EMAIL_REGISTRATION_EMAIL_SENT_MESSAGE = 'common.messages.email.registrationEmailSentMessage',

  // Telegram Messages
  MESSAGES_TELEGRAM_CONNECTION_MESSAGE = 'common.messages.telegram.connectionMessage',
  MESSAGES_TELEGRAM_DISCONNECTION_MESSAGE = 'common.messages.telegram.disconnectionMessage',
  MESSAGES_TELEGRAM_GREETINGS_MESSAGE = 'common.messages.telegram.greetingsMessage',
  MESSAGES_TELEGRAM_AUTHORIZE_THROUGH_WEBSITE = 'common.messages.telegram.authorizeThroughWebsite',

  // Webhook Messages
  MESSAGES_WEBHOOK_HEALTH_IS_OK = 'common.messages.trello.webhook.webhookHealthIsOk',
  MESSAGES_WEBHOOK_WAS_RECREATED = 'common.messages.trello.webhook.webhookWasRecreated',

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

  // Trello Errors
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
}
