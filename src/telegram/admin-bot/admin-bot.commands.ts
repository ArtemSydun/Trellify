import { Context, Telegraf } from 'telegraf';

export const commandTranslations = {
  en: [{ command: '/start', description: '🚀 Start bot' }],
  uk: [{ command: '/start', description: '🚀 Розпочати' }],
  // Add more languages here...
};

export async function setLocalizedCommands(bot: Telegraf<Context>) {
  for (const [languageCode, commands] of Object.entries(commandTranslations)) {
    await bot.telegram.setMyCommands(commands, { language_code: languageCode });
  }
}
