import { forwardRef, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IntentsBitField } from 'discord.js';
import { NecordModule } from 'necord';
import { configServiceKeys } from 'src/common/enums/config-service-keys.enum';
import { UsersModule } from 'src/user/users.module';
import { DiscordCommands } from './discord.commands';
import { DiscordService } from './discord.service';

@Module({
  imports: [
    NecordModule.forRootAsync({
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        token: configService.get<string>(configServiceKeys.DISCORD_BOT_TOKEN),
        intents: [
          IntentsBitField.Flags.Guilds,
          IntentsBitField.Flags.DirectMessages,
          IntentsBitField.Flags.MessageContent,
        ],
        development: [
          configService.get<string>(
            configServiceKeys.DISCORD_DEVELOPMENT_GUILD_ID,
          ),
        ],
      }),
    }),
    forwardRef(() => UsersModule),
  ],
  controllers: [],
  providers: [DiscordService, DiscordCommands],
  exports: [DiscordService],
})
export class DiscordModule {}
