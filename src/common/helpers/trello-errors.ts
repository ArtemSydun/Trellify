import { I18nContext } from 'nestjs-i18n';
import { I18nKeys } from '../enums/i18n-keys.enum';

export function parseTrelloError(err: any, i18n?: I18nContext): string {
  // Default message in case we don't have a structured response
  let message = 'An error occurred while processing the Trello request';

  if (err.response && err.response.data) {
    if (typeof err.response.data === 'string') {
      message = err.response.data;
    } else if (typeof err.response.data === 'object') {
      message = err.response.data.message ?? JSON.stringify(err.response.data);
    }
  } else {
    message = err.message;
  }
  console.log(message.toLowerCase());
  switch (message.toLowerCase()) {
    case 'invalid key':
      message =
        i18n?.t(I18nKeys.ERRORS_TRELLO_INVALID_APP_KEY) ||
        'Trello responded with "invalid key". Something is wrong with Trellify';
      break;
    case 'invalid app token':
      message =
        i18n?.t(I18nKeys.ERRORS_TRELLO_INVALID_TOKEN) ||
        'Trello responded with "invalid app token". Please ensure your Trello token is valid.';
      break;
    case 'The requested resource was not found.':
      message =
        i18n?.t(I18nKeys.ERRORS_TRELLO_INVALID_ENTITY_ID) ||
        `This ENTITY was not found or was deleted`;
      break;
    case 'invalid value for idWebhook':
      message =
        i18n?.t(I18nKeys.ERRORS_TRELLO_INVALID_WEBHOOK_ID) ||
        `Invalid value for idWebhook`;
      break;
    case 'unauthorized permission requested':
      message =
        i18n?.t(I18nKeys.ERRORS_TRELLO_UNATHORIZED_PERMISSION) ||
        `Author token does not have permissions to get this content`;
      break;

    default:
      // No change; use the message as-is
      break;
  }

  return message;
}
