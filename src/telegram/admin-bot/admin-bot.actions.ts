import { AdminBotService } from './admin-bot.service';
import { AdminBotUtils } from './admin-bot.utils';

export class AdminBotActions {
  private readonly adminBotUtils: AdminBotUtils;

  constructor(private readonly adminBotService: AdminBotService) {
    this.adminBotUtils = new AdminBotUtils();
  }
}
