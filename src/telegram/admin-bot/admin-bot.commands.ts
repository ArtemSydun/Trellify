import { TelegramCommandsEnum } from 'src/common/enums/telegram-commands.enum';
import { Context, Telegraf } from 'telegraf';

export const commandTranslations = {
  en: [
    { command: `/${TelegramCommandsEnum.START}`, description: '🚀 Start bot' },
  ],
  uk: [
    { command: `/${TelegramCommandsEnum.START}`, description: '🚀 Розпочати' },
  ],
  // Add more languages here...
};

export async function setLocalizedCommands(bot: Telegraf<Context>) {
  for (const [languageCode, commands] of Object.entries(commandTranslations)) {
    await bot.telegram.setMyCommands(commands, { language_code: languageCode });
  }
}
