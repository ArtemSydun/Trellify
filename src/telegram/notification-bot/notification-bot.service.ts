/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  forwardRef,
  Inject,
  Injectable,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { I18nService } from 'nestjs-i18n';
import { InjectBot } from 'nestjs-telegraf';
import { configServiceEnum } from 'src/common/enums/config.service.enum';
import { I18nKeys } from 'src/common/enums/i18n-keys.enum';
import { Languages } from 'src/common/enums/languages.enum';
import { TelegramSettings } from 'src/user/dto/telegram.settings.dto';
import { User } from 'src/user/entities/user.entity';
import { UserSearchPathEnum } from 'src/user/enums/query.enum';
import { UsersRepository } from 'src/user/repositories/users.repository';
import { Telegraf, Context, Markup } from 'telegraf';
import { NotificationBotActions } from './notification-bot.actions';
import { BOT_MESSAGES } from './notification-bot.messages';
import { NotificationBotUtils } from './notification-bot.utils';

@Injectable()
export class NotificationBotService implements OnModuleInit {
  private readonly logger = new Logger(NotificationBotService.name);
  private notificationBotActions: NotificationBotActions;
  private notificationBotUtils: NotificationBotUtils;

  constructor(
    @InjectBot('notificationBot') private readonly bot: Telegraf<Context>,
    private readonly configService: ConfigService,
    private readonly userRepository: UsersRepository,
    private readonly i18n: I18nService,
  ) {
    this.notificationBotUtils = new NotificationBotUtils();
  }

  // ✅ Initialize bot commands when module loads
  async onModuleInit() {
    this.setupCommands();
  }

  private setupCommands() {
    this.bot.start(async (ctx: any) => {
      const userLanguage =
        ctx?.update?.message?.from?.language_code || Languages.EN;

      const userTelegramName: string =
        ctx?.update?.message?.from?.first_name ||
        ctx?.update?.message?.from?.last_name ||
        ctx?.update?.message?.from?.username;

      const chatId: number = ctx?.update?.message?.from?.id;
      const username: string = ctx?.update?.message?.chat?.username;

      const keyboard = Markup.keyboard([
        ['💻 Trellify Website', '⚙️ Trellify Configuration'],
      ])
        .resize()
        .persistent();

      if (!chatId) {
        await ctx.reply(`${BOT_MESSAGES.ERROR.GENERAL}`);
      }

      const user: User = await this.userRepository.findUserByProperty(
        UserSearchPathEnum.TelegramChatId,
        chatId,
      );

      if (user) {
        await ctx.reply(
          this.i18n?.t(I18nKeys.MESSAGES_GENERAL_PROFILE_FOUND, {
            lang: user.language,
            args: {
              infoUrl: `${this.configService.get<string>(configServiceEnum.FRONTEND_LINK)}/help`,
            },
          }) ||
            `Your telegram account have already been authorized. To setup configuration for notifications, follow steps [here](${this.configService.get<string>(configServiceEnum.FRONTEND_LINK)}/help)`,

          { parse_mode: 'Markdown', ...keyboard },
        );
      } else {
        await ctx.reply(
          this.i18n?.t(I18nKeys.MESSAGES_GENERAL_GREETINGS_MESSAGE, {
            lang: userLanguage,
            args: {
              name: userTelegramName,
            },
          }) ||
            `Hello ${userTelegramName}, authorize through website to start Trellify integration`,
          keyboard,
        );

        await ctx.reply(
          this.i18n?.t(I18nKeys.MESSAGES_GENERAL_AUTHORIZE_THROUGH_WEBSITE, {
            lang: userLanguage,
          }) || 'Authorize through website',
          {
            reply_markup: {
              inline_keyboard: [
                [
                  {
                    text: 'Trellify',
                    url: `${this.configService.get<string>(configServiceEnum.FRONTEND_LINK)}/settings/telegram?chatId=${chatId}&username=${username}`,
                  },
                ],
              ],
            },
          },
        );
      }
    });

    this.bot.help(async (ctx: any) => {
      const chatId: number = ctx?.update?.message?.from?.id;
      let userLanguage =
        ctx?.update?.message?.from?.language_code || Languages.EN;

      const user: User = await this.userRepository.findUserByProperty(
        UserSearchPathEnum.TelegramChatId,
        chatId,
      );

      if (user.language) {
        userLanguage = user.language;
      }

      const introMessage = this.i18n.t(
        I18nKeys.MESSAGES_GENERAL_HELP_INTRO_MESSAGE,
        {
          lang: userLanguage,
        },
      );

      const steps = this.i18n.t(I18nKeys.MESSAGES_GENERAL_HELP_STEPS, {
        lang: userLanguage,
        args: {
          websiteUrl: this.configService.get(configServiceEnum.FRONTEND_LINK),
        },
      });

      const closingMessage = this.i18n.t(
        I18nKeys.MESSAGES_GENERAL_HELP_CLOSING,
        {
          lang: userLanguage,
        },
      );

      const helpMessage =
        `${introMessage}\n\n1️⃣ ${steps[0]}\n2️⃣ ${steps[1]}\n3️⃣ ${steps[2]}\n4️⃣ ${steps[3]}\n\n${closingMessage}`.trim();

      await ctx.reply(helpMessage, { parse_mode: 'Markdown' });
    });

    this.bot.command('my_profile', async (ctx: any) => {
      const chatID: number = ctx?.update?.message?.from?.id;
      let userLanguage = ctx?.update?.message?.from?.language_code;
      const username: string = ctx?.update?.message?.chat?.username;

      if (!chatID) {
        await ctx.reply(`${BOT_MESSAGES.ERROR.GENERAL}`);
        return;
      }

      try {
        const user: null | User = await this.userRepository.findUserByProperty(
          UserSearchPathEnum.TelegramChatId,
          chatID,
        );

        userLanguage = user.language;

        const userProfile = {
          email: user.email,
          trello: {
            username: user.trello.username,
            notifications: user.trello.webhooks.map((w) => w.modelName),
          },
          telegram: {
            username: user.telegram.username,
          },
          language: user.language,
        };
        await this.notificationBotUtils.handleMyProfileCommand({
          ctx,
          userProfile,
        });
      } catch (error) {
        await ctx.reply(
          this.i18n?.t(I18nKeys.ERRORS_GENERAL_PROFILE_NOT_FOUND, {
            lang: userLanguage,
          }),
          {
            reply_markup: {
              inline_keyboard: [
                [
                  {
                    text:
                      this.i18n?.t(
                        I18nKeys.MESSAGES_GENERAL_AUTHORIZE_THROUGH_WEBSITE,
                        { lang: userLanguage },
                      ) || 'Authorize through website',
                    url: `${this.configService.get<string>(configServiceEnum.FRONTEND_LINK)}/settings?chatId=${chatID}&username=${username}`,
                  },
                ],
              ],
            },
          },
        );
      }
    });

    this.bot.hears('💻 Trellify Website', async (ctx: any) => {
      await ctx.reply(
        `[💻 Trellify Website](${this.configService.get(
          configServiceEnum.LANDING_LINK,
        )})\n`,
        { parse_mode: 'Markdown' },
      );
    });

    this.bot.hears('⚙️ Trellify Configuration', async (ctx: any) => {
      await ctx.reply(
        `[⚙️ Trellify Configuration](${this.configService.get(
          configServiceEnum.FRONTEND_LINK,
        )})\n`,
        { parse_mode: 'Markdown' },
      );
    });
  }

  async sendMessageToUser(
    telegramInfo: TelegramSettings,
    message: string,
    html?: boolean,
    replyMarkup?: any,
  ) {
    if (telegramInfo.chatId) {
      const parseMode = html ? 'HTML' : 'Markdown';
      await this.bot.telegram.sendMessage(telegramInfo.chatId, message, {
        parse_mode: parseMode,
        reply_markup: replyMarkup?.inline_keyboard
          ? replyMarkup
          : { inline_keyboard: replyMarkup },
      });
    }
  }

  async fetchTelegramUser(chatId: number): Promise<any> {
    try {
      const response = await axios.get(
        `https://api.telegram.org/bot${this.configService.get(
          configServiceEnum.TELEGRAM_NOTIFICATION_BOT_TOKEN,
        )}/getChat`,
        { params: { chat_id: chatId } },
      );
      return response.data.result;
    } catch (err) {
      this.logger.error(err.response ? err.response?.message : err.message);
    }
  }
}
