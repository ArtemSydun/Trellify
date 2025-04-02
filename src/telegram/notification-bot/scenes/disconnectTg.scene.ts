import { I18nService } from 'nestjs-i18n';
import { Context, Wizard, WizardStep } from 'nestjs-telegraf';
import { TELEGRAM_BTN_ACTIONS } from 'src/common/constants/telegram';
import { I18nKeys } from 'src/common/enums/i18n-keys.enum';
import { Languages } from 'src/common/enums/languages.enum';
import { UserSearchPath } from 'src/user/enums/query.enum';
import { UsersRepository } from 'src/user/repositories/users.repository';
import { UsersService } from 'src/user/services/users.service';
import { Markup } from 'telegraf';
import { BOT_MESSAGES } from '../notification-bot.messages';
import { NotificationBotUtils } from '../notification-bot.utils';

@Wizard('disconnectTg')
export class DisconnectTgScene {
  private readonly telegramUtils: NotificationBotUtils;

  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly usersService: UsersService,
    private readonly i18n: I18nService,
  ) {
    this.telegramUtils = new NotificationBotUtils();
  }

  @WizardStep(1)
  async step1(@Context() ctx) {
    const chatID = ctx?.from?.id;
    const telegramNickname = ctx?.chat?.username;
    let userLanguage =
      ctx?.update?.message?.from?.language_code || Languages.EN;

    ctx.wizard.state.chatID = chatID;
    ctx.wizard.state.telegramNickname = telegramNickname;

    try {
      const user = await this.usersRepository.findUserByProperty(
        UserSearchPath.TelegramChatId,
        chatID,
      );

      // If user not found
      if (!user) {
        await ctx.reply(
          this.i18n?.t(I18nKeys.ERRORS_TELEGRAM_BOT_IS_NOT_CONNECTED, {
            lang: userLanguage,
          }) || 'Your telegram account is not connected.',
        );
        return ctx.scene.leave();
      }

      userLanguage = user.language;

      // Store for later steps
      ctx.wizard.state.user = user;
      ctx.wizard.state.userLanguage = userLanguage;

      const keyboard = [
        [
          Markup.button.callback('✅', TELEGRAM_BTN_ACTIONS.OK),
          Markup.button.callback('❌', TELEGRAM_BTN_ACTIONS.CANCEL),
        ],
      ];

      await ctx.reply(
        this.i18n?.t(I18nKeys.MESSAGES_DISCORD_DISCONNECT_CONFIRMATION, {
          lang: userLanguage,
        }) || 'Are you sure you want to disconnect your Telegram account?',
        Markup.inlineKeyboard(keyboard),
      );

      ctx.wizard.next();
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      await ctx.reply(
        this.i18n.t(I18nKeys.ERRORS_GENERAL_DEFAULT, { lang: userLanguage }) ||
          'An error occurred. Please try again later.',
      );
      return ctx.scene.leave();
    }
  }

  @WizardStep(2)
  async step2(@Context() ctx) {
    const selectedAction = ctx?.update?.callback_query?.data;
    const user = ctx.wizard.state.user;
    const userLanguage = ctx.wizard.state.userLanguage || Languages.EN;

    await ctx.editMessageReplyMarkup({});

    if (!selectedAction) {
      await ctx.reply(BOT_MESSAGES.ERROR.GENERAL);
      return;
    }

    if (selectedAction === TELEGRAM_BTN_ACTIONS.CANCEL) {
      try {
        await ctx.deleteMessage();
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (error) {
        await ctx.reply(
          this.i18n.t(I18nKeys.ERRORS_GENERAL_DEFAULT, {
            lang: userLanguage,
          }) || 'Disconnection error',
        );
      }

      return ctx.scene.leave();
    }

    try {
      await this.usersRepository.updateById(user?.id, {
        telegram: {
          chatId: null,
          username: null,
          updatedAt: new Date(),
        },
      });

      await ctx.reply(
        this.i18n.t(I18nKeys.MESSAGES_TELEGRAM_DISCONNECTED_SUCCESSFULLY, {
          lang: userLanguage,
        }) || 'Disconnected successfully.',
      );
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      console.log(error);
      await ctx.reply(
        this.i18n.t(I18nKeys.ERRORS_GENERAL_DEFAULT, { lang: userLanguage }) ||
          'Disconnection error',
      );
    }

    return ctx.scene.leave();
  }
}
