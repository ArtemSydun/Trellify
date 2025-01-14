/* eslint-disable @typescript-eslint/no-unused-vars */
import { ConfigService } from '@nestjs/config';
import { SkipThrottle } from '@nestjs/throttler';
import {
  InjectBot,
  Start,
  Update,
  Action,
  Ctx,
  Command,
} from 'nestjs-telegraf';
import { configServiceEnum } from 'src/common/enums/config.service.enum';
import { User } from 'src/user/entities/user.entity';
import { UserSearchPath } from 'src/user/enums/query.enum';
import { UsersService } from 'src/user/services/users.service';
import { Context, Telegraf } from 'telegraf';

import { TelegramActions } from './telegram.actions';
import { COMMANDS } from './telegram.commands';
import { BOT_MESSAGES } from './telegram.messages';
import { TelegramService } from './telegram.service';

import { TelegramUtils } from './telegram.utils';

@Update()
@SkipThrottle()
export class TelegramController {
  private readonly telegramActions: TelegramActions;
  private readonly telegramUtils: TelegramUtils;

  constructor(
    @InjectBot() private readonly bot: Telegraf<Context>,
    private readonly telegramService: TelegramService,
    private readonly userService: UsersService,
    private readonly configService: ConfigService,
  ) {
    this.bot.telegram.setMyCommands(COMMANDS);
    this.telegramActions = new TelegramActions(this.telegramService);
    this.telegramUtils = new TelegramUtils();
  }

  @Start()
  async startCommand(ctx): Promise<any> {
    const userTelegramName: string =
      ctx?.update?.message?.from?.first_name ||
      ctx?.update?.message?.from?.username;

    await ctx.reply(`${BOT_MESSAGES.NEW_USER_GREETING}, ${userTelegramName}`);

    const chatId: number = ctx?.update?.message?.from?.id;
    const username: string = ctx?.update?.message?.chat?.username;

    if (!chatId) {
      await ctx.reply(`${BOT_MESSAGES.ERROR.GENERAL}`);
    }

    try {
      const user: User = await this.userService.findUserByProperty(
        UserSearchPath.TelegramChatId,
        chatId,
      );
    } catch (err) {
      await ctx.reply('Please visit our website for more information:', {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: 'Authorize through website',
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

    if (!chatID) {
      await ctx.reply(`${BOT_MESSAGES.ERROR.GENERAL}`);
    }

    const user: null | User = await this.userService.findUserByProperty(
      UserSearchPath.TelegramChatId,
      chatID,
    );

    if (!user) {
      await ctx.reply(`YOU'RE NOT REGISTERED YET`);
    }

    // Message for new user
    if (!user) {
      try {
        await ctx.reply(`${BOT_MESSAGES.NEW_USER_MY_PROFILE}`);
      } catch (error) {
        console.log('sendMessage :::', error.message);
      }
    }
    // Exist user
    else {
      await this.telegramUtils.handleMyProfileCommand({ ctx, user });
    }
  }
}
