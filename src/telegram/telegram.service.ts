import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { InjectBot } from 'nestjs-telegraf';
import { configServiceEnum } from 'src/common/enums/config.service.enum';
import { TelegramSettings } from 'src/user/dto/telegram.settings.dto';
import { Telegraf, Context } from 'telegraf';

@Injectable()
export class TelegramService {
  private readonly logger = new Logger(TelegramService.name);

  constructor(
    @InjectBot() private readonly bot: Telegraf<Context>,
    private readonly configService: ConfigService,
  ) {}

  async sendMessageToUser(
    telegramInfo: TelegramSettings,
    message: string,
    html?: boolean,
  ) {
    if (telegramInfo.chatId) {
      const parseMode = html ? 'HTML' : 'Markdown';
      await this.bot.telegram.sendMessage(telegramInfo.chatId, message, {
        parse_mode: parseMode,
      });
      this.logger.log(`Telegram message sent to user ${telegramInfo.username}`);
    }
  }

  async fetchTelegramUser(chatId: number): Promise<any> {
    try {
      const response = await axios.get(
        `https://api.telegram.org/bot${this.configService.get(configServiceEnum.TELEGRAM_BOT_TOKEN)}/getChat`,
        { params: { chat_id: chatId } },
      );
      return response.data.result;
    } catch (err) {
      this.logger.error(err.response ? err.response?.message : err.message);
    }
  }
}
