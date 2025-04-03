import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SkipThrottle } from '@nestjs/throttler';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  CommandInteraction,
  Interaction,
  MessageFlags,
} from 'discord.js';
import { Context, On, SlashCommand, SlashCommandContext } from 'necord';
import { I18nService } from 'nestjs-i18n';
import { RateLimiterMemory } from 'rate-limiter-flexible';
import { configServiceKeys } from 'src/common/enums/config-service-keys.enum';
import { DiscordCommandsEnum } from 'src/common/enums/discord-commands.enum';
import { I18nKeys } from 'src/common/enums/i18n-keys.enum';
import { Languages, supportedLanguages } from 'src/common/enums/languages.enum';
import { UserSearchPath } from 'src/user/enums/query.enum';
import { UsersRepository } from 'src/user/repositories/users.repository';
import { DiscordService } from './discord.service';
import { DiscordRateLimiterService } from './rate-limiter/discord-rate-limiter.service';

@SkipThrottle()
@Injectable()
export class DiscordCommands {
  private readonly rateLimiter = new RateLimiterMemory({
    points: 5,
    duration: 15,
  });

  public constructor(
    private readonly discordRateLimiter: DiscordRateLimiterService,
    private readonly discordService: DiscordService,
    private readonly configService: ConfigService,
    private readonly userRepository: UsersRepository,
    private readonly i18n: I18nService,
  ) {}

  @SlashCommand({
    name: DiscordCommandsEnum.START,
    description: 'Trellify start',
  })
  public async onStart(@Context() [interaction]: SlashCommandContext) {
    // console.log(interaction);
    const userId: string = interaction.user.id;
    const username: string = interaction.user.username;
    const userLanguage = supportedLanguages.includes(
      interaction.locale.split('-')[0] as Languages,
    )
      ? interaction.locale.split('-')[0]
      : Languages.EN;

    const isLimited = await this.discordRateLimiter.isLimited(
      userId,
      DiscordCommands.name,
    );

    if (isLimited) {
      const wait = Math.ceil(
        (await this.discordRateLimiter.getRemainingTTL(
          userId,
          DiscordCommands.name,
        )) / 1000,
      );

      return interaction.reply(
        this.i18n?.t(I18nKeys.ERRORS_TELEGRAM_RATE_LIMIT_EXCEEDED, {
          args: { seconds: wait },
          lang: userLanguage,
        }) || `Too many requests. Please wait ${wait}s.`,
      );
    }

    const frontendUrl = `${this.configService.get(configServiceKeys.FRONTEND_LINK)}/settings/discord?userId=${interaction.user.id}&username=${interaction.user.username}`;
    const button = new ButtonBuilder()
      .setLabel('Authorize Trellify')
      .setStyle(ButtonStyle.Link)
      .setURL(frontendUrl);

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(button);

    return interaction.reply({
      content:
        this.i18n?.t(I18nKeys.MESSAGES_GENERAL_GREETINGS_MESSAGE, {
          lang: userLanguage,
          args: {
            name: username,
          },
        }) || 'Click the button below to authorize Trellify bot:',
      components: [row],
    });
  }

  @SlashCommand({
    name: DiscordCommandsEnum.HELP,
    description: 'Trellify FAQ',
  })
  public async onHelp(@Context() [interaction]: SlashCommandContext) {
    // console.log(interaction);
    const userId: string = interaction.user.id;
    let userLanguage = supportedLanguages.includes(
      interaction.locale.split('-')[0] as Languages,
    )
      ? interaction.locale.split('-')[0]
      : Languages.EN;

    const isLimited = await this.discordRateLimiter.isLimited(
      userId,
      DiscordCommands.name,
    );

    if (isLimited) {
      const wait = Math.ceil(
        (await this.discordRateLimiter.getRemainingTTL(
          userId,
          DiscordCommands.name,
        )) / 1000,
      );

      return interaction.reply(
        this.i18n?.t(I18nKeys.ERRORS_TELEGRAM_RATE_LIMIT_EXCEEDED, {
          args: { seconds: wait },
          lang: userLanguage,
        }) || `Too many requests. Please wait ${wait}s.`,
      );
    }

    const user = await this.userRepository.findUserByProperty(
      UserSearchPath.DiscordUserId,
      userId,
    );

    if (user) {
      userLanguage = user.language;
    }

    const introMessage = this.i18n.t(
      I18nKeys.MESSAGES_GENERAL_HELP_INTRO_MESSAGE,
      {
        lang: userLanguage,
      },
    );

    const steps = this.i18n.t(I18nKeys.MESSAGES_GENERAL_HELP_STEPS, {
      lang: userLanguage,
      args: {
        websiteUrl: this.configService.get(configServiceKeys.FRONTEND_LINK),
      },
    });

    const closingMessage = this.i18n.t(I18nKeys.MESSAGES_GENERAL_HELP_CLOSING, {
      lang: userLanguage,
    });

    const helpMessage =
      `${introMessage}\n\n1️⃣ ${steps[0]}\n2️⃣ ${steps[1]}\n3️⃣ ${steps[2]}\n4️⃣ ${steps[3]}\n\n${closingMessage}`.trim();

    return interaction.reply({
      content: helpMessage,
    });
  }

  @SlashCommand({
    name: DiscordCommandsEnum.DISCONNECT,
    description: 'Disconnect your Discord account',
  })
  public async onDisconnect(@Context() [interaction]: [CommandInteraction]) {
    const userId = interaction.user.id;
    const langCode = interaction.locale.split('-')[0];
    const userLanguage = supportedLanguages.includes(langCode as Languages)
      ? langCode
      : Languages.EN;

    const isLimited = await this.discordRateLimiter.isLimited(
      userId,
      DiscordCommands.name,
    );

    if (isLimited) {
      const wait = Math.ceil(
        (await this.discordRateLimiter.getRemainingTTL(
          userId,
          DiscordCommands.name,
        )) / 1000,
      );

      return interaction.reply(
        this.i18n?.t(I18nKeys.ERRORS_TELEGRAM_RATE_LIMIT_EXCEEDED, {
          args: { seconds: wait },
          lang: userLanguage,
        }) || `Too many requests. Please wait ${wait}s.`,
      );
    }

    const user = await this.userRepository.findUserByProperty(
      UserSearchPath.DiscordUserId,
      userId,
    );

    if (!user) {
      return interaction.reply({
        content:
          this.i18n?.t(I18nKeys.ERRORS_DISCORD_BOT_IS_NOT_CONNECTED, {
            lang: userLanguage,
          }) || 'Discord bot is not connected',
        flags: MessageFlags.Ephemeral,
      });
    }

    const confirmationMessage = this.i18n.t(
      I18nKeys.MESSAGES_DISCORD_DISCONNECT_CONFIRMATION,
      {
        lang: user.language,
      },
    );

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId('disconnect_confirm')
        .setLabel('✅ Yes')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId('disconnect_cancel')
        .setLabel('❌ No')
        .setStyle(ButtonStyle.Danger),
    );

    return interaction.reply({
      content: confirmationMessage,
      components: [row],
      flags: MessageFlags.Ephemeral,
    });
  }

  @On('interactionCreate')
  async onInteraction(@Context() [interaction]: [Interaction]) {
    if (!interaction.isButton || typeof interaction.isButton !== 'function') {
      return;
    }

    if (!interaction.isButton()) return;

    const userId = interaction.user?.id;
    const langCode = interaction.locale.split('-')[0];
    const userLanguage = supportedLanguages.includes(langCode as Languages)
      ? langCode
      : Languages.EN;

    if (interaction.customId === 'disconnect_confirm') {
      const user = await this.userRepository.findUserByProperty(
        UserSearchPath.DiscordUserId,
        userId,
      );

      if (!user) {
        return interaction.reply({
          content:
            this.i18n?.t(I18nKeys.ERRORS_DISCORD_BOT_IS_NOT_CONNECTED, {
              lang: userLanguage,
            }) || 'This discord account is not connected to Trellify.',
          flags: MessageFlags.Ephemeral,
        });
      }

      await this.userRepository.updateById(user.id, {
        discord: {
          userId: null,
          username: null,
          updatedAt: new Date(),
        },
      });

      return interaction.update({
        content:
          this.i18n?.t(I18nKeys.MESSAGES_DISCORD_DISCONNECTED_SUCCESSFULLY) ||
          'Your Discord account has been disconnected.',
        components: [],
      });
    }

    if (interaction.customId === 'disconnect_cancel') {
      return interaction.update({
        content:
          this.i18n?.t(I18nKeys.ERRORS_GENERAL_ACTION_CANCELED, {
            lang: userLanguage,
          }) || 'Action cancelled.',
        components: [],
      });
    }
  }
}
