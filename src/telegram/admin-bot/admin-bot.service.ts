import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { I18nService } from 'nestjs-i18n';
import { InjectBot } from 'nestjs-telegraf';
import { RateLimiterMemory } from 'rate-limiter-flexible';
import { AdminBotActions } from 'src/common/enums/admin-bot-actions.enum';
import { I18nKeys } from 'src/common/enums/i18n-keys.enum';
import { Languages } from 'src/common/enums/languages.enum';
import { TelegramSettings } from 'src/user/dto/telegram.settings.dto';
import { User } from 'src/user/entities/user.entity';
import { UserSearchPath } from 'src/user/enums/query.enum';
import { UserRoles } from 'src/user/enums/role.enum';
import { UsersRepository } from 'src/user/repositories/users.repository';
import { Telegraf, Context } from 'telegraf';
import { TelegramRateLimiterService } from '../rate-limiter/telegram-rate-limiter.service';
import { BOT_MESSAGES } from './admin-bot.messages';

@Injectable()
export class AdminBotService implements OnModuleInit {
  private readonly logger = new Logger(AdminBotService.name);
  private readonly rateLimiter = new RateLimiterMemory({
    points: 3,
    duration: 10,
  });

  constructor(
    @InjectBot('adminBot') private readonly bot: Telegraf<Context>,
    private readonly telegramRateLimiter: TelegramRateLimiterService,

    private readonly userRepository: UsersRepository,
    private readonly configService: ConfigService,
    private readonly i18n: I18nService,
  ) {}

  // ✅ Initialize bot commands on module load
  async onModuleInit() {
    this.setupCommands();
  }

  private setupCommands() {
    this.bot.start(async (ctx) => {
      const userTelegramName: string =
        ctx?.update?.message?.from?.first_name ||
        ctx?.update?.message?.from?.last_name ||
        ctx?.update?.message?.from?.username;

      const chatId: number = ctx?.update?.message?.from?.id;

      const userLanguage =
        ctx?.update?.message?.from?.language_code || Languages.EN;

      if (!chatId) {
        await ctx.reply(`${BOT_MESSAGES.ERROR.GENERAL}`);
      }

      const isLimited = await this.telegramRateLimiter.isLimited(
        chatId.toString(),
        AdminBotService.name,
      );

      if (isLimited) {
        const wait = Math.ceil(
          (await this.telegramRateLimiter.getRemainingTTL(
            chatId.toString(),
            AdminBotService.name,
          )) / 1000,
        );

        return ctx.reply(
          this.i18n?.t(I18nKeys.ERRORS_TELEGRAM_RATE_LIMIT_EXCEEDED, {
            args: { seconds: wait },
            lang: userLanguage,
          }) || `Too many requests. Please wait ${wait}s.`,
        );
      }

      const user: User = await this.userRepository.findUserByProperty(
        UserSearchPath.TelegramChatId,
        chatId,
      );
      if (user) {
        if (
          user.role === UserRoles.admin ||
          user.role === UserRoles.superadmin
        ) {
          await ctx.reply(`Hello ${userTelegramName}, we are ready to start!`);
        } else {
          await ctx.reply(`Sorry, you do not have access to this bot 😭`);
        }
      } else {
        await ctx.reply(`You are not Trellify user 😭`);
      }
    });
  }

  async sendMessageToUser(
    telegramInfo: TelegramSettings,
    message: string,
    html?: boolean,
  ) {
    if (telegramInfo.chatId) {
      try {
        const parseMode = html ? 'HTML' : 'Markdown';
        await this.bot.telegram.sendMessage(telegramInfo.chatId, message, {
          parse_mode: parseMode,
        });
        this.logger.log(
          `Telegram message sent to user ${telegramInfo.username}`,
        );
      } catch (err) {
        this.logger.warn(
          `Failed sending Telegram message to ${telegramInfo.username}. Error: ${err.response.message || err.message || err.response.description}`,
        );
      }
    }
  }

  async actionAdminNotification(action: any, payload: any): Promise<string> {
    const dateString = `<b>📅 Date:</b> ${new Date().toLocaleString()}`;

    let notification: string;

    switch (action) {
      case AdminBotActions.USER_REGISTERED: {
        const { email } = payload;
        notification =
          `User ${email} registered in Trellify successfully \n` + dateString;
        break;
      }

      case AdminBotActions.USER_DELETED: {
        const { email } = payload;
        notification =
          `User ${email} deleted from Trellify successfully \n` + dateString;
        break;
      }

      case AdminBotActions.CONTACT_US: {
        const { email, subject, message, authorized } = payload;
        notification =
          `${authorized ? '<b>Trellify User</b>' : '<b>Website Visitor</b>'} ${email} sent a message via <b>Contact Us</b> form.\n\n` +
          `<b>📌 Subject:</b> ${subject}\n` +
          `<b>✉️ Message:</b> ${message}\n` +
          dateString;

        break;
      }

      default:
        this.logger.warn(`${action} is not in list of admin notifications`);
        return;
    }

    return notification;
  }

  async dailyStatsNotification(date: string, dailyStats: any): Promise<string> {
    const dateString = `<b>Date:</b> ${new Date().toLocaleString()}`;

    let notification = `📊 <b>Trellify Daily Stats</b> for <b>${date}</b>\n`;

    for (const [key, value] of Object.entries(dailyStats)) {
      notification += `\n ${key}: ${value} \n`;
    }
    return notification + '\n' + dateString;
  }

  async weeklyStatsNotification(
    dateRange: string,
    weeklyStats: any,
  ): Promise<string> {
    const dateString = `<b>Date Range:</b> ${dateRange}`;

    let notification = `📊 <b>Trellify Weekly Stats</b> for <b>${dateRange}</b>\n`;

    for (const [key, value] of Object.entries(weeklyStats)) {
      notification += `\n ${key}: ${value} \n`;
    }

    return notification + '\n' + dateString;
  }

  async notifyAdmins(message: string): Promise<void> {
    const adminsToNotify = await this.userRepository.findAdmins();

    if (adminsToNotify.length === 0) {
      this.logger.warn('No admins found to notify.');
      return;
    }

    const messagePromises = adminsToNotify.map((admin) =>
      this.sendMessageToUser(admin.telegram, message, true),
    );

    await Promise.all(messagePromises);
  }
}
