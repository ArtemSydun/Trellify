import { Context, Telegraf } from 'telegraf';

export const COMMANDS = [
  {
    command: '/start',
    description: '🚀 Start bot',
  },
  {
    command: '/my_profile',
    description: '👤 Profile',
  },
  {
    command: '/help',
    description: '❓ Help',
  },
];

export async function setLocalizedCommands(bot: Telegraf<Context>) {
  const commandTranslations = {
    en: [
      { command: '/start', description: 'Start bot' },
      { command: '/my_profile', description: 'Profile' },
      { command: '/help', description: 'Help' },
    ],
    uk: [
      { command: '/start', description: 'Розпочати' },
      { command: '/my_profile', description: 'Профіль' },
      { command: '/help', description: 'Допомога' },
    ],
    // Add more languages here...
  };

  for (const [languageCode, commands] of Object.entries(commandTranslations)) {
    await bot.telegram.setMyCommands(commands, { language_code: languageCode });
  }
}
