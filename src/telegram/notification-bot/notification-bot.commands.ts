import { TelegramCommands } from 'src/common/enums/telegram-commands';
import { Context, Telegraf } from 'telegraf';

export const commandTranslations = {
  en: [
    { command: `/${TelegramCommands.START}`, description: '🚀 Start bot' },
    { command: `/${TelegramCommands.MY_PROFILE}`, description: '👤 Profile' },
    {
      command: `/${TelegramCommands.DISCONNECT}`,
      description: '🔗 Disconnect',
    },
    { command: `/${TelegramCommands.HELP}`, description: '❓ Help' },
  ],
  uk: [
    { command: `/${TelegramCommands.START}`, description: '🚀 Розпочати' },
    { command: `/${TelegramCommands.MY_PROFILE}`, description: '👤 Профіль' },
    {
      command: `/${TelegramCommands.DISCONNECT}`,
      description: '🔗 Відключити',
    },
    { command: `/${TelegramCommands.HELP}`, description: '❓ Допомога' },
  ],
  // Add more languages here...
};

export async function setLocalizedCommands(bot: Telegraf<Context>) {
  for (const [languageCode, commands] of Object.entries(commandTranslations)) {
    await bot.telegram.setMyCommands(commands, { language_code: languageCode });
  }
}
