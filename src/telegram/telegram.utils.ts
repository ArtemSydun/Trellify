import { TELEGRAM_BTN_ACTIONS } from 'src/common/constants/telegram';
import { ISendMessageOptions } from 'src/common/interfaces/sendMessageOptions';
import { Markup } from 'telegraf';

import { BOT_MESSAGES } from './telegram.messages';

export class TelegramUtils {
  async createDelayedSendMessage(timerValue: number): Promise<any> {
    return new Promise((resolve) => setTimeout(resolve, timerValue));
  }

  async handleDelayedSendMessage(options: ISendMessageOptions): Promise<any> {
    const { delayValue, ctx, message, action } = options;

    await this.createDelayedSendMessage(delayValue);

    if (message) {
      await ctx.reply(message);
    } else {
      await action(ctx);
    }
  }

  async skipSceneStep(ctx) {
    const keyboard = [
      [
        Markup.button.callback(
          BOT_MESSAGES.BTN_TITLE.SKIP,
          TELEGRAM_BTN_ACTIONS.SKIP_STEP,
        ),
      ],
    ];
    ctx.reply(
      `${BOT_MESSAGES.SKIP_SCENE_STEP_PARAGRAPH}`,
      Markup.inlineKeyboard(keyboard),
    );
  }

  async backToMenu(ctx) {
    const keyboard = [
      [
        Markup.button.callback(
          BOT_MESSAGES.BTN_TITLE.BACK,
          TELEGRAM_BTN_ACTIONS.CANCEL,
        ),
      ],
    ];

    ctx.reply(
      `${BOT_MESSAGES.SKIP_SCENE_STEP_PARAGRAPH}`,
      Markup.inlineKeyboard(keyboard),
    );
  }

  async handleMyProfileCommand(params: { ctx; user }) {
    const { ctx, user } = params;

    return await ctx.reply(
      `Here is your profile: ${JSON.stringify(user, null, 2)}`,
    );
  }
}
