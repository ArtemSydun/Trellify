import { TelegramCommandsEnum } from 'src/common/enums/telegram-commands.enum';
import { Context, Telegraf } from 'telegraf';

export const commandTranslations = {
  en: [
    { command: `/${TelegramCommandsEnum.START}`, description: '🚀 Start bot' },
    {
      command: `/${TelegramCommandsEnum.MY_PROFILE}`,
      description: '👤 Profile',
    },
    {
      command: `/${TelegramCommandsEnum.DISCONNECT}`,
      description: '🔗 Disconnect',
    },
    { command: `/${TelegramCommandsEnum.HELP}`, description: '❓ Help' },
  ],
  uk: [
    { command: `/${TelegramCommandsEnum.START}`, description: '🚀 Розпочати' },
    {
      command: `/${TelegramCommandsEnum.MY_PROFILE}`,
      description: '👤 Профіль',
    },
    {
      command: `/${TelegramCommandsEnum.DISCONNECT}`,
      description: '🔗 Відключити',
    },
    { command: `/${TelegramCommandsEnum.HELP}`, description: '❓ Допомога' },
  ],
  // Add more languages here...
};

export async function setLocalizedCommands(bot: Telegraf<Context>) {
  for (const [languageCode, commands] of Object.entries(commandTranslations)) {
    await bot.telegram.setMyCommands(commands, { language_code: languageCode });
  }
}
