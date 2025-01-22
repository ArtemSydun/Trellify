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
} from 'nestjs-telegraf';
import { configServiceEnum } from 'src/common/enums/config.service.enum';
import { I18nKeys } from 'src/common/enums/i18n-keys.enum';
import { User } from 'src/user/entities/user.entity';
import { UserSearchPathEnum } from 'src/user/enums/query.enum';
import { UsersService } from 'src/user/services/users.service';
import { Context, Telegraf } from 'telegraf';

import { TelegramActions } from './telegram.actions';
import { COMMANDS, setLocalizedCommands } from './telegram.commands';
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
    // console.log(ctx?.update?.message);
    let userLanguage = ctx?.update?.message?.from?.language_code;
    const userTelegramName: string =
      ctx?.update?.message?.from?.first_name ||
      ctx?.update?.message?.from?.username;

    await ctx.reply(
      this.i18n?.t(I18nKeys.MESSAGES_TELEGRAM_GREETINGS_MESSAGE, {
        lang: userLanguage,
        args: {
          name: userTelegramName,
        },
      }) ||
        `Hello ${userTelegramName}, click on /start to start Trellify integration`,
    );

    const chatId: number = ctx?.update?.message?.from?.id;
    const username: string = ctx?.update?.message?.chat?.username;

    if (!chatId) {
      await ctx.reply(`${BOT_MESSAGES.ERROR.GENERAL}`);
    }

    try {
      const user: User = await this.userService.findUserByProperty(
        UserSearchPathEnum.TelegramChatId,
        chatId,
      );

      if (user) {
        userLanguage = user.language;
      }
    } catch (err) {
      console.log(userLanguage);
      console.log(
        this.i18n?.t(I18nKeys.MESSAGES_TELEGRAM_AUTHORIZE_THROUGH_WEBSITE, {
          lang: userLanguage,
        }),
      );
      await ctx.reply('Please visit our website for more information:', {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text:
                  this.i18n?.t(
                    I18nKeys.MESSAGES_TELEGRAM_AUTHORIZE_THROUGH_WEBSITE,
                    { lang: userLanguage },
                  ) || 'Authorize through website',
                url: `${this.configService.get<string>(configServiceEnum.FRONTEND_LINK)}/settings?chatId=${chatId}&username=${username}`,
              },
            ],
          ],
        },
      });
    }
  }

  // @Help()
  // async helpCommand(ctx): Promise<any> {
  //   await ctx.reply('help command activated')
  // }

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

    console.log(ctx.update?.message);
    if (!chatID) {
      await ctx.reply(`${BOT_MESSAGES.ERROR.GENERAL}`);
      return;
    }

    try {
      const user: null | User = await this.userService.findUserByProperty(
        UserSearchPathEnum.TelegramChatId,
        chatID,
      );

      if (!user) {
        // User not found - handle as new user
        try {
          await ctx.reply(`YOU'RE NOT REGISTERED YET`);
          await ctx.reply(`${BOT_MESSAGES.NEW_USER_MY_PROFILE}`);
        } catch (error) {
          console.error('Error sending new user message:', error.message);
        }
      } else {
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
      }
    } catch (error) {
      await ctx.reply(`${BOT_MESSAGES.ERROR.GENERAL}`);
    }
  }
}
