import { Injectable } from '@nestjs/common';
import { Telegraf, Context } from 'telegraf';
import { InjectBot } from 'nestjs-telegraf';
import { TelegramSettings } from 'src/user/dto/telegram.settings.dto';

@Injectable()
export class TelegramService {
  constructor(
    @InjectBot() private readonly bot: Telegraf<Context>,
  ) {}

  async sendMessageToUser(telegramInfo: TelegramSettings, message: string, html?: boolean) {
    if (telegramInfo.chatId) {
      const parseMode = html ? 'HTML' : 'Markdown';
      await this.bot.telegram.sendMessage(telegramInfo.chatId, message, { parse_mode: parseMode });
    }
  }
}
