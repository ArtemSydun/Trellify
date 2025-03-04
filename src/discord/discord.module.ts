import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IntentsBitField } from 'discord.js';
import { NecordModule } from 'necord';
import { configServiceEnum } from 'src/common/enums/config.service.enum';
import { DiscordCommands } from './discord.commands';
import { DiscordService } from './discord.service';

@Module({
  imports: [
    NecordModule.forRootAsync({
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        token: configService.get<string>(configServiceEnum.DISCORD_BOT_TOKEN),
        intents: [
          IntentsBitField.Flags.Guilds,
          IntentsBitField.Flags.DirectMessages,
          IntentsBitField.Flags.MessageContent,
        ],
        development: [process.env.DISCORD_DEVELOPMENT_GUILD_ID],
      }),
    }),
  ],
  controllers: [],
  providers: [DiscordService, DiscordCommands],
  exports: [DiscordService],
})
export class DiscordModule {}
