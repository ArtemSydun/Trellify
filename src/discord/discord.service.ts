import { Injectable, Logger } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { Client } from 'discord.js';
import { Context, ContextOf, On, Once } from 'necord';

@SkipThrottle()
@Injectable()
export class DiscordService {
  private readonly logger = new Logger(DiscordService.name);

  // Injecting the already created client
  public constructor(private readonly client: Client) {
    // You only need to update the client's intents if it's already initialized by another part of the app.
  }

  public async sendDirectMessage(userId: string, message: string) {
    try {
      const user = await this.client.users.fetch(userId);
      if (user) {
        console.log(user);
        await user.send(message);
        console.log(`✅ Message sent to ${user.tag}`);
      } else {
        console.log(`⚠️ User not found: ${userId}`);
      }
    } catch (error) {
      console.error(`❌ Error sending message to ${userId}: ${error}`);
    }
  }

  @Once('ready')
  public async onReady(@Context() [client]: ContextOf<'ready'>) {
    this.logger.log(`Bot logged in as ${client.user.username}`);
    console.log(`Bot logged in as ${client.user.username}`);
    console.log('Bot token from client:', client.token);
  }

  @On('warn')
  public onWarn(@Context() [message]: ContextOf<'warn'>) {
    this.logger.warn(message);
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

    // Command handler for !ping
    if (message.content === '!ping') {
      message.reply('Pong!');
      console.log('Ping command received');
    }
  }
}
