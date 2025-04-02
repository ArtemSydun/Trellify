import { Context, Telegraf } from 'telegraf';

export const commandTranslations = {
  en: [
    { command: '/start', description: '🚀 Start bot' },
    { command: '/my_profile', description: '👤 Profile' },
    { command: '/disconnect', description: '🔗 Disconnect' },
    { command: '/help', description: '❓ Help' },
  ],
  uk: [
    { command: '/start', description: '🚀 Розпочати' },
    { command: '/my_profile', description: '👤 Профіль' },
    { command: '/disconnect', description: '🔗 Відключити' },
    { command: '/help', description: '❓ Допомога' },
  ],
  // Add more languages here...
};

export async function setLocalizedCommands(bot: Telegraf<Context>) {
  for (const [languageCode, commands] of Object.entries(commandTranslations)) {
    await bot.telegram.setMyCommands(commands, { language_code: languageCode });
  }
}
