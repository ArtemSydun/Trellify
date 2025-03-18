import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SkipThrottle } from '@nestjs/throttler';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { Context, SlashCommand, SlashCommandContext } from 'necord';
import { I18nService } from 'nestjs-i18n';
import { configServiceKeys } from 'src/common/enums/config-service-keys.enum';
import { I18nKeys } from 'src/common/enums/i18n-keys.enum';
import { Languages, supportedLanguages } from 'src/common/enums/languages.enum';
import { UserSearchPath } from 'src/user/enums/query.enum';
import { UsersRepository } from 'src/user/repositories/users.repository';
import { DiscordService } from './discord.service';

@SkipThrottle()
@Injectable()
export class DiscordCommands {
  public constructor(
    private readonly discordService: DiscordService,
    private readonly configService: ConfigService,
    private readonly userRepository: UsersRepository,
    private readonly i18n: I18nService,
  ) {}

  @SlashCommand({
    name: 'start',
    description: 'Trellify start',
  })
  public async onStart(@Context() [interaction]: SlashCommandContext) {
    // console.log(interaction);
    const frontendUrl = `${this.configService.get(configServiceKeys.FRONTEND_LINK)}/settings/discord?userId=${interaction.user.id}&username=${interaction.user.username}`;
    const button = new ButtonBuilder()
      .setLabel('Authorize Trellify')
      .setStyle(ButtonStyle.Link)
      .setURL(frontendUrl);

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(button);

    return interaction.reply({
      content: 'Click the button below to authorize Trellify bot:',
      components: [row],
    });
  }

  @SlashCommand({
    name: 'help',
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
}
