import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SkipThrottle } from '@nestjs/throttler';
import { Context, SlashCommand, SlashCommandContext } from 'necord';
import { configServiceEnum } from 'src/common/enums/config.service.enum';
import { DiscordService } from './discord.service';

@SkipThrottle()
@Injectable()
export class DiscordCommands {
  public constructor(
    private readonly discordService: DiscordService,
    private readonly configService: ConfigService,
  ) {}
  @SlashCommand({
    name: 'start',
    description: 'Trellify discord start',
  })
  public async onStart(@Context() [interaction]: SlashCommandContext) {
    console.log(interaction.user);
    const frontendUrl = `${this.configService.get(configServiceEnum.FRONTEND_LINK)}/settings/discord?userId=${interaction.user.id}&username=${interaction.user.username}`;

    return interaction.reply({
      content: `Authorize Trellify bot by this [link](${frontendUrl})`,
    });
  }
}
