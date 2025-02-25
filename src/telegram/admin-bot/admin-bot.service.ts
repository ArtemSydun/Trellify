import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectBot } from 'nestjs-telegraf';
import { AdminBotActionsEnum } from 'src/common/enums/admin-bot-actions.enum';
import { TelegramSettings } from 'src/user/dto/telegram.settings.dto';
import { User } from 'src/user/entities/user.entity';
import { UserSearchPathEnum } from 'src/user/enums/query.enum';
import { UserRoles } from 'src/user/enums/role.enum';
import { UsersRepository } from 'src/user/repositories/users.repository';
import { Telegraf, Context } from 'telegraf';
import { BOT_MESSAGES } from './admin-bot.messages';

@Injectable()
export class AdminBotService implements OnModuleInit {
  private readonly logger = new Logger(AdminBotService.name);

  constructor(
    @InjectBot('adminBot') private readonly bot: Telegraf<Context>,
    private readonly userRepository: UsersRepository,
    private readonly configService: ConfigService,
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

      if (!chatId) {
        await ctx.reply(`${BOT_MESSAGES.ERROR.GENERAL}`);
      }

      const user: User = await this.userRepository.findUserByProperty(
        UserSearchPathEnum.TelegramChatId,
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
          `Failed sending Telegram message to ${telegramInfo.username}. Error: ${err.response.description || err.response.message || err.message}`,
        );
      }
    }
  }

  async actionAdminNotification(action: any, payload: any): Promise<string> {
    const dateString = `<b>📅 Date:</b> ${new Date().toLocaleString()}`;

    let notification: string;

    switch (action) {
      case AdminBotActionsEnum.USER_REGISTERED: {
        const { email } = payload;
        notification =
          `User ${email} registered in Trellify successfully \n` + dateString;
        break;
      }

      case AdminBotActionsEnum.USER_DELETED: {
        const { email } = payload;
        notification =
          `User ${email} deleted from Trellify successfully \n` + dateString;
        break;
      }

      case AdminBotActionsEnum.CONTACT_US: {
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

    let notification = `Daily stats for <b>${date}</b> \n`;

    for (const [key, value] of Object.entries(dailyStats)) {
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
