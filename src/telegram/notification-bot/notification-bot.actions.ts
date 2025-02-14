import { NotificationBotService } from './notification-bot.service';
import { NotificationBotUtils } from './notification-bot.utils';

export class NotificationBotActions {
  private readonly notificationBotUtils: NotificationBotUtils;

  constructor(private readonly notificationBotService: NotificationBotService) {
    this.notificationBotUtils = new NotificationBotUtils();
  }
}
