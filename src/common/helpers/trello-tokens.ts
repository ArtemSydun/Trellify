import { BadRequestException } from '@nestjs/common';
import { I18nContext } from 'nestjs-i18n';
import { I18nKeys } from '../enums/i18n-keys.enum';

export function validateTrelloToken(
  token: string | undefined | null,
  i18n?: I18nContext,
): void {
  if (!token) {
    throw new BadRequestException(
      i18n?.t(I18nKeys.ERRORS_TRELLO_CHECK_CONNECTION) ||
        'Please check your Trello connection',
    );
  }
  if (typeof token !== 'string' || token.trim() === '') {
    throw new BadRequestException(
      i18n?.t(I18nKeys.ERRORS_TRELLO_INVALID_TOKEN) || 'Invalid Trello token',
    );
  }
}
