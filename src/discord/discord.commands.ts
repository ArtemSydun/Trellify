import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SkipThrottle } from '@nestjs/throttler';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { Context, SlashCommand, SlashCommandContext } from 'necord';
import { I18nService } from 'nestjs-i18n';
import { configServiceEnum } from 'src/common/enums/config.service.enum';
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
    description: 'Trellify discord start',
  })
  public async onStart(@Context() [interaction]: SlashCommandContext) {
    // console.log(interaction);
    const frontendUrl = `${this.configService.get(configServiceEnum.FRONTEND_LINK)}/settings/discord?userId=${interaction.user.id}&username=${interaction.user.username}`;

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
}
