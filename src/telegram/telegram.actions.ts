import { TelegramService } from './telegram.service';

import { TelegramUtils } from './telegram.utils';

export class TelegramActions {
  private readonly telegramUtils: TelegramUtils;

  constructor(private readonly telegramService: TelegramService) {
    this.telegramUtils = new TelegramUtils();
  }
}
