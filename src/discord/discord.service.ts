import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SkipThrottle } from '@nestjs/throttler';
import { Client } from 'discord.js';
import { Context, ContextOf, On, Once } from 'necord';
// import { configServiceEnum } from 'src/common/enums/config.service.enum';

@SkipThrottle()
@Injectable()
export class DiscordService {
  private readonly logger = new Logger(DiscordService.name);

  // Injecting the already created client
  public constructor(
    private readonly client: Client,
    private readonly configService: ConfigService,
  ) {
    // this.client.once('ready', async () => {
    //   if (!this.client.user || !this.client.application) return;
    //   const guildId = this.configService.get(
    //     configServiceEnum.DISCORD_DEVELOPMENT_GUILD_ID,
    //   ); // Replace with your actual guild ID
    //   const guild = this.client.guilds.cache.get(guildId);
    //   if (!guild) {
    //     console.error('Guild not found');
    //     return;
    //   }
    //   try {
    //     const commands = await guild.commands.fetch();
    //     commands.forEach(async (command) => {
    //       await guild.commands.delete(command.id);
    //       console.log(`Deleted command: ${command.name}`);
    //     });
    //   } catch (error) {
    //     console.error('Error deleting commands:', error);
    //   }
    // });
  }

  public async sendDirectMessage(userId: string, message: string) {
    try {
      const user = await this.client.users.fetch(userId);
      if (user) {
        await user.send(message);
      }
    } catch (error) {
      console.error(`❌ Error sending message to ${userId}: ${error}`);
    }
  }

  @Once('ready')
  public async onReady(@Context() [client]: ContextOf<'ready'>) {
    this.logger.log(`Bot logged in as ${client.user.username}`);
    console.log(`Bot logged in as ${client.user.username}`);
  }

  // Listen for message creation
  @On('messageCreate')
  public onMessage(@Context() [message]: ContextOf<'messageCreate'>) {
    console.log('Received message:', message.content); // Logs all incoming messages
    // Ensure it's a direct message
    if (message.guild === null) {
      console.log(`Direct message received: ${message.content}`);
      this.logger.log(`Direct message received: ${message.content}`);
    } else {
      console.log(`Message from ${message.guild.name}: ${message.content}`);
    }
  }
}
