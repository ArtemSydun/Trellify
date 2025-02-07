/* eslint-disable @typescript-eslint/no-unused-vars */
import { ConfigService } from '@nestjs/config';
import { SkipThrottle } from '@nestjs/throttler';
import { I18nService } from 'nestjs-i18n';
import {
  InjectBot,
  Start,
  Update,
  Action,
  Ctx,
  Command,
  Help,
} from 'nestjs-telegraf';
import { configServiceEnum } from 'src/common/enums/config.service.enum';
import { I18nKeys } from 'src/common/enums/i18n-keys.enum';
import { Languages } from 'src/common/enums/languages.enum';
import { User } from 'src/user/entities/user.entity';
import { UserSearchPathEnum } from 'src/user/enums/query.enum';
import { UsersService } from 'src/user/services/users.service';
import { Context, Telegraf } from 'telegraf';

import { TelegramActions } from './telegram.actions';
import { setLocalizedCommands } from './telegram.commands';
import { BOT_MESSAGES } from './telegram.messages';
import { TelegramService } from './telegram.service';

import { TelegramUtils } from './telegram.utils';

@Update()
@SkipThrottle()
export class TelegramController {
  private telegramActions: TelegramActions;
  private telegramUtils: TelegramUtils;

  constructor(
    @InjectBot() private readonly bot: Telegraf<Context>,
    private readonly telegramService: TelegramService,
    private readonly userService: UsersService,
    private readonly configService: ConfigService,
    private readonly i18n: I18nService,
  ) {
    (async () => {
      await setLocalizedCommands(this.bot);
      this.telegramActions = new TelegramActions(this.telegramService);
      this.telegramUtils = new TelegramUtils();
    })();
  }

  @Start()
  async startCommand(ctx): Promise<any> {
    const userLanguage =
      ctx?.update?.message?.from?.language_code || Languages.EN;

    const userTelegramName: string =
      ctx?.update?.message?.from?.first_name ||
      ctx?.update?.message?.from?.last_name ||
      ctx?.update?.message?.from?.username;

    const chatId: number = ctx?.update?.message?.from?.id;
    const username: string = ctx?.update?.message?.chat?.username;

    try {
      if (!chatId) {
        await ctx.reply(`${BOT_MESSAGES.ERROR.GENERAL}`);
      }

      const user: User = await this.userService.findUserByProperty(
        UserSearchPathEnum.TelegramChatId,
        chatId,
      );

      if (user) {
        if (username && user.telegram.username !== username) {
          await this.userService.updateUser(user, {
            telegram: {
              username,
              updatedAt: new Date(),
            },
          });
        }

        await ctx.reply(
          this.i18n?.t(I18nKeys.MESSAGES_TELEGRAM_PROFILE_FOUND, {
            lang: user.language,
            args: {
              infoUrl: `${this.configService.get<string>(configServiceEnum.FRONTEND_LINK)}/help`,
            },
          }) ||
            `Your telegram account have already been authorized. To setup configuration for notifications, follow steps [here](${this.configService.get<string>(configServiceEnum.FRONTEND_LINK)}/help)`,

          { parse_mode: 'Markdown' },
        );
      }
    } catch (err) {
      console.log(err);
      await ctx.reply(
        this.i18n?.t(I18nKeys.MESSAGES_TELEGRAM_GREETINGS_MESSAGE, {
          lang: userLanguage,
          args: {
            name: userTelegramName,
          },
        }) ||
          `Hello ${userTelegramName}, authorize through website to start Trellify integration`,
      );

      await ctx.reply(
        this.i18n?.t(I18nKeys.MESSAGES_TELEGRAM_AUTHORIZE_THROUGH_WEBSITE, {
          lang: userLanguage,
        }) || 'Authorize through website',
        {
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: 'Trellify',
                  url: `${this.configService.get<string>(configServiceEnum.FRONTEND_LINK)}/settings?chatId=${chatId}&username=${username}`,
                },
              ],
            ],
          },
        },
      );
    }
  }

  @Help()
  async helpCommand(ctx): Promise<any> {
    const userLanguage = ctx?.update?.message?.from?.language_code || 'en';

    const introMessage = this.i18n.t(
      I18nKeys.MESSAGES_TELEGRAM_HELP_INTRO_MESSAGE,
      {
        lang: userLanguage,
      },
    );
    const steps = this.i18n.t(I18nKeys.MESSAGES_TELEGRAM_HELP_STEPS, {
      lang: userLanguage,
      args: {
        websiteUrl: this.configService.get(configServiceEnum.FRONTEND_LINK),
      },
    });
    const closingMessage = this.i18n.t(
      I18nKeys.MESSAGES_TELEGRAM_HELP_CLOSING,
      {
        lang: userLanguage,
      },
    );

    const helpMessage =
      `${introMessage}\n\n1️⃣ ${steps[0]}\n2️⃣ ${steps[1]}\n3️⃣ ${steps[2]}\n4️⃣ ${steps[3]}\n\n${closingMessage}`.trim();

    await ctx.reply(helpMessage, { parse_mode: 'Markdown' });
  }

  // @On('sticker')
  // async stickerResponse(ctx): Promise<any> {
  //   await ctx.reply('👍');
  // }

  // @Hears('hi')
  // async hearsMessage(ctx: Context): Promise<any> {
  //   const tgUser = ctx.from;
  //   await ctx.reply(`hello, ${tgUser.first_name}, your nickname is ${tgUser.username}, your country code is ${tgUser.language_code}`);
  // }

  @Command('my_profile')
  async myProfileCommand(ctx): Promise<any> {
    const chatID: number = ctx?.update?.message?.from?.id;
    let userLanguage = ctx?.update?.message?.from?.language_code;
    const username: string = ctx?.update?.message?.chat?.username;

    if (!chatID) {
      await ctx.reply(`${BOT_MESSAGES.ERROR.GENERAL}`);
      return;
    }

    try {
      const user: null | User = await this.userService.findUserByProperty(
        UserSearchPathEnum.TelegramChatId,
        chatID,
      );

      userLanguage = user.language;

      // User exists - prepare and send profile
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
      await this.telegramUtils.handleMyProfileCommand({ ctx, userProfile });
    } catch (error) {
      await ctx.reply(
        this.i18n?.t(I18nKeys.ERRORS_TELEGRAM_PROFILE_NOT_FOUND, {
          lang: userLanguage,
        }),
        {
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text:
                    this.i18n?.t(
                      I18nKeys.MESSAGES_TELEGRAM_AUTHORIZE_THROUGH_WEBSITE,
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
  }
}
