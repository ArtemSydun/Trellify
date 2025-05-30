/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  forwardRef,
  Inject,
  Injectable,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { I18nService } from 'nestjs-i18n';
import { InjectBot } from 'nestjs-telegraf';
import { RateLimiterMemory } from 'rate-limiter-flexible';
import { configServiceKeys } from 'src/common/enums/config-service-keys.enum';
import { I18nKeys } from 'src/common/enums/i18n-keys.enum';
import { Languages } from 'src/common/enums/languages.enum';
import { TelegramCommandsEnum } from 'src/common/enums/telegram-commands.enum';
import { RedisService } from 'src/redis/services/redis.service';
import { TrelloWebhooksLogicService } from 'src/trello/services/logic';
import { TelegramSettings } from 'src/user/dto/telegram.settings.dto';
import { User } from 'src/user/entities/user.entity';
import { UserSearchPath } from 'src/user/enums/query.enum';
import { UsersRepository } from 'src/user/repositories/users.repository';
import { UsersService } from 'src/user/services/users.service';
import { Telegraf, Context, Markup } from 'telegraf';
import { TelegramRateLimiterService } from '../rate-limiter/telegram-rate-limiter.service';
import { NotificationBotActions } from './notification-bot.actions';
import { setLocalizedCommands } from './notification-bot.commands';
import { BOT_MESSAGES } from './notification-bot.messages';
import { NotificationBotUtils } from './notification-bot.utils';
@Injectable()
export class NotificationBotService implements OnModuleInit {
  private readonly logger = new Logger(NotificationBotService.name);
  private notificationBotActions: NotificationBotActions;
  private notificationBotUtils: NotificationBotUtils;
  private readonly rateLimiter = new RateLimiterMemory({
    points: 5,
    duration: 15,
  });

  constructor(
    @InjectBot('notificationBot') private readonly bot: Telegraf<Context>,
    private readonly telegramRateLimiter: TelegramRateLimiterService,
    private readonly configService: ConfigService,
    private readonly userRepository: UsersRepository,
    @Inject(forwardRef(() => UsersService))
    private readonly userService: UsersService,
    @Inject(forwardRef(() => TrelloWebhooksLogicService))
    private readonly trelloWebhooksLogicService: TrelloWebhooksLogicService,
    @Inject(forwardRef(() => RedisService))
    private readonly redisService: RedisService,
    private readonly i18n: I18nService,
  ) {
    this.notificationBotUtils = new NotificationBotUtils();
  }

  // ✅ Initialize bot commands when module loads
  async onModuleInit() {
    this.setupCommands();
  }

  private setupCommands() {
    this.bot.start(async (ctx: any) => {
      console.log(ctx.update);
      const userLanguage =
        ctx?.update?.message?.from?.language_code || Languages.EN;

      const userTelegramName: string =
        ctx?.update?.message?.from?.first_name ||
        ctx?.update?.message?.from?.last_name ||
        ctx?.update?.message?.from?.username;

      const chatId: number = ctx?.update?.message?.from?.id;
      const username: string = ctx?.update?.message?.chat?.username;

      const isLimited = await this.telegramRateLimiter.isLimited(
        chatId.toString(),
        NotificationBotService.name,
      );

      if (isLimited) {
        const wait = Math.ceil(
          (await this.telegramRateLimiter.getRemainingTTL(
            chatId.toString(),
            NotificationBotService.name,
          )) / 1000,
        );

        return ctx.reply(
          this.i18n?.t(I18nKeys.ERRORS_TELEGRAM_RATE_LIMIT_EXCEEDED, {
            args: { seconds: wait },
            lang: userLanguage,
          }) || `Too many requests. Please wait ${wait}s.`,
        );
      }

      const keyboard = Markup.keyboard([
        ['💻 Trellify Website', '⚙️ Trellify Configuration'],
      ])
        .resize()
        .persistent();

      if (!chatId) {
        await ctx.reply(`${BOT_MESSAGES.ERROR.GENERAL}`);
      }

      const user: User = await this.userRepository.findUserByProperty(
        UserSearchPath.TelegramChatId,
        chatId,
      );

      if (user) {
        await ctx.reply(
          this.i18n?.t(I18nKeys.MESSAGES_GENERAL_PROFILE_FOUND, {
            lang: user.language,
            args: {
              infoUrl: `${this.configService.get<string>(configServiceKeys.FRONTEND_LINK)}/help`,
            },
          }) ||
            `Your telegram account have already been authorized. To setup configuration for notifications, follow steps [here](${this.configService.get<string>(configServiceKeys.FRONTEND_LINK)}/help)`,

          { parse_mode: 'Markdown', ...keyboard },
        );
      } else {
        await ctx.reply(
          this.i18n?.t(I18nKeys.MESSAGES_GENERAL_GREETINGS_MESSAGE, {
            lang: userLanguage,
            args: {
              name: userTelegramName,
            },
          }) ||
            `Hello ${userTelegramName}, authorize through website to start Trellify integration`,
          keyboard,
        );

        await ctx.reply(
          this.i18n?.t(I18nKeys.MESSAGES_GENERAL_AUTHORIZE_THROUGH_WEBSITE, {
            lang: userLanguage,
          }) || 'Authorize through website',
          {
            reply_markup: {
              inline_keyboard: [
                [
                  {
                    text: 'Trellify',
                    url: `${this.configService.get<string>(configServiceKeys.FRONTEND_LINK)}/settings/telegram?chatId=${chatId}&username=${username}`,
                  },
                ],
              ],
            },
          },
        );
      }
    });

    this.bot.help(async (ctx: any) => {
      const chatId: number = ctx?.update?.message?.from?.id;
      let userLanguage =
        ctx?.update?.message?.from?.language_code || Languages.EN;

      const isLimited = await this.telegramRateLimiter.isLimited(
        chatId.toString(),
        NotificationBotService.name,
      );

      if (isLimited) {
        const wait = Math.ceil(
          (await this.telegramRateLimiter.getRemainingTTL(
            chatId.toString(),
            NotificationBotService.name,
          )) / 1000,
        );

        return ctx.reply(
          this.i18n?.t(I18nKeys.ERRORS_TELEGRAM_RATE_LIMIT_EXCEEDED, {
            args: { seconds: wait },
            lang: userLanguage,
          }) || `Too many requests. Please wait ${wait}s.`,
        );
      }

      const user: User = await this.userRepository.findUserByProperty(
        UserSearchPath.TelegramChatId,
        chatId,
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

      const closingMessage = this.i18n.t(
        I18nKeys.MESSAGES_GENERAL_HELP_CLOSING,
        {
          lang: userLanguage,
        },
      );

      const helpMessage =
        `${introMessage}\n\n1️⃣ ${steps[0]}\n2️⃣ ${steps[1]}\n3️⃣ ${steps[2]}\n4️⃣ ${steps[3]}\n\n${closingMessage}`.trim();

      await ctx.reply(helpMessage, { parse_mode: 'Markdown' });
    });

    this.bot.command(TelegramCommandsEnum.GROUP, async (ctx: any) => {
      const isGroupChat = ctx?.update?.message?.chat?.type === 'group';
      const userID = ctx?.update?.message?.from?.id;
      const chatID: number = ctx?.update?.message?.chat?.id;
      const username: string = ctx?.update?.message?.chat?.username;

      let userLanguage =
        ctx?.update?.message?.from?.language_code || Languages.EN;

      if (!isGroupChat) {
        return ctx.reply(
          this.i18n?.t(I18nKeys.ERRORS_GENERAL_BOT_COMMAND_GROUP_ONLY, {
            lang: userLanguage,
          }) || 'This command can only be used in group chats.',
        );
      }

      if (!chatID || !userID) {
        console.log(chatID, userID);
        return ctx.reply(BOT_MESSAGES.ERROR.GENERAL);
      }

      const isLimited = await this.telegramRateLimiter.isLimited(
        userID,
        NotificationBotService.name,
      );

      if (isLimited) {
        const wait = Math.ceil(
          (await this.telegramRateLimiter.getRemainingTTL(
            userID,
            NotificationBotService.name,
          )) / 1000,
        );

        return ctx.reply(
          this.i18n?.t(I18nKeys.ERRORS_TELEGRAM_RATE_LIMIT_EXCEEDED, {
            args: { seconds: wait },
            lang: userLanguage,
          }) || `Too many requests. Please wait ${wait}s.`,
        );
      }

      try {
        const user = await this.userRepository.findUserByProperty(
          UserSearchPath.TelegramChatId,
          userID,
        );

        if (!user) {
          throw new Error('User not found');
        }

        userLanguage = user.language || Languages.EN;

        const userWebhooks = user.trello.webhooks;
        const subscribedWebhooks =
          await this.trelloWebhooksLogicService.findUserSubscribedWebhooks(
            user,
          );
        const redisKey = `webhook_selection:${userID}:${chatID}`;

        // Try to fetch selection from Redis
        let selectedWebhookIds: Set<string> = new Set();
        const rawSelection = await this.redisService.getValue(redisKey);

        if (!rawSelection) {
          // First time — initialize from DB state
          selectedWebhookIds = new Set(
            userWebhooks
              .filter((wh) =>
                subscribedWebhooks.some(
                  (sw) =>
                    sw.id === wh.webhookId &&
                    sw.telegramChannels?.some((ch) => ch.channelId === chatID),
                ),
              )
              .map((wh) => wh.webhookId),
          );

          // Store in Redis for consistent toggle experience
          await this.redisService.setValue(
            redisKey,
            JSON.stringify(Array.from(selectedWebhookIds)),
          );
        } else {
          try {
            selectedWebhookIds = new Set(JSON.parse(rawSelection));
          } catch (err) {
            console.warn(
              `Failed to parse Redis selection: ${rawSelection}`,
              err,
            );
            selectedWebhookIds = new Set();
          }
        }

        // Generate inline keyboard buttons
        const webhookOptions = userWebhooks.map((webhook) => {
          const isSelected = selectedWebhookIds.has(webhook.webhookId);

          return [
            {
              text: `${isSelected ? '✅ ' : ''}${webhook.modelName}`,
              callback_data: `toggleWebhook:${webhook.webhookId}:${chatID}`,
            },
          ];
        });

        // Add Save / Cancel buttons
        webhookOptions.push([
          { text: '💾 Save', callback_data: `saveWebhooks:null:${chatID}` },
          { text: '❌ Cancel', callback_data: `cancelWebhooks:null:${chatID}` },
        ]);

        const reply = await ctx.reply(
          'Select which Trello webhooks you want to connect or disconnect:',
          {
            reply_markup: {
              inline_keyboard: webhookOptions,
            },
          },
        );

        // Optional: clean up after 1 minute
        setTimeout(async () => {
          await this.redisService.deleteValue(redisKey);
          this.bot.telegram
            .editMessageText(
              reply.chat.id,
              reply.message_id,
              undefined,
              '⚠️ Selection expired. Please send the command again to manage your webhooks.',
            )
            .catch((err) => console.warn('Failed to expire message:', err));
        }, 60 * 1000);

        // await ctx.reply(
        //   'Select which Trello webhooks you want to connect or disconnect:',
        //   {
        //     reply_markup: {
        //       inline_keyboard: webhookOptions,
        //     },
        //   },
        // );

        // const webhookOptions = userWebhooks.map((webhook) => {
        //   const isConnected = subscribedWebhooks.some(
        //     (sw) =>
        //       sw.id === webhook.webhookId &&
        //       sw.telegramChannels?.some((ch) => ch.channelId === chatID),
        //   );

        //   return [
        //     {
        //       text: `${isConnected ? '✅ ' : ''}${webhook.modelName}`,
        //       callback_data: `toggleWebhook:${webhook.webhookId}:${chatID}`,
        //     },
        //   ];
        // });

        // await ctx.reply(
        //   // this.i18n?.t(I18nKeys.MESSAGES_SELECT_WEBHOOKS_TO_CONNECT, {
        //   //   lang: userLanguage,
        //   // }) ||
        //   'Select which Trello webhooks you want to connect or disconnect:',
        //   {
        //     reply_markup: {
        //       inline_keyboard: webhookOptions,
        //     },
        //   },
        // );
      } catch (error) {
        console.log(error);
      }
    });

    this.bot.command(TelegramCommandsEnum.MY_PROFILE, async (ctx: any) => {
      const chatId = ctx?.from?.id?.toString();
      const chatID: number = ctx?.update?.message?.from?.id;
      let userLanguage = ctx?.update?.message?.from?.language_code;
      const username: string = ctx?.update?.message?.chat?.username;

      const isLimited = await this.telegramRateLimiter.isLimited(
        chatId,
        NotificationBotService.name,
      );

      if (isLimited) {
        const wait = Math.ceil(
          (await this.telegramRateLimiter.getRemainingTTL(
            chatId,
            NotificationBotService.name,
          )) / 1000,
        );

        return ctx.reply(
          this.i18n?.t(I18nKeys.ERRORS_TELEGRAM_RATE_LIMIT_EXCEEDED, {
            args: { seconds: wait },
            lang: userLanguage,
          }) || `Too many requests. Please wait ${wait}s.`,
        );
      }

      if (!chatID) {
        await ctx.reply(`${BOT_MESSAGES.ERROR.GENERAL}`);
        return;
      }

      try {
        const user: null | User = await this.userRepository.findUserByProperty(
          UserSearchPath.TelegramChatId,
          chatID,
        );

        userLanguage = user.language;

        const userProfile = {
          email: user.email,
          trello: {
            username: user.trello.username,
            notifications: user.trello.webhooks.map((w) => w.modelName),
          },
          telegram: {
            username: user.telegram.username,
          },
          language: user.language,
        };
        await this.notificationBotUtils.handleMyProfileCommand({
          ctx,
          userProfile,
        });
      } catch (error) {
        await ctx.reply(
          this.i18n?.t(I18nKeys.ERRORS_GENERAL_PROFILE_NOT_FOUND, {
            lang: userLanguage,
          }),
          {
            reply_markup: {
              inline_keyboard: [
                [
                  {
                    text:
                      this.i18n?.t(
                        I18nKeys.MESSAGES_GENERAL_AUTHORIZE_THROUGH_WEBSITE,
                        { lang: userLanguage },
                      ) || 'Authorize through website',
                    url: `${this.configService.get<string>(configServiceKeys.FRONTEND_LINK)}/settings?chatId=${chatID}&username=${username}`,
                  },
                ],
              ],
            },
          },
        );
      }
    });

    this.bot.command(TelegramCommandsEnum.DISCONNECT, async (ctx: any) => {
      const chatId: number = ctx?.update?.message?.from?.id;
      const telegramNickname: string = ctx?.update?.message?.chat?.username;
      const userLanguage = ctx?.update?.message?.from?.language_code;

      if (!chatId) {
        await ctx.reply(`${BOT_MESSAGES.ERROR.GENERAL}`);
        return;
      }

      const isLimited = await this.telegramRateLimiter.isLimited(
        chatId.toString(),
        NotificationBotService.name,
      );

      if (isLimited) {
        const wait = Math.ceil(
          (await this.telegramRateLimiter.getRemainingTTL(
            chatId.toString(),
            NotificationBotService.name,
          )) / 1000,
        );

        return ctx.reply(
          this.i18n?.t(I18nKeys.ERRORS_TELEGRAM_RATE_LIMIT_EXCEEDED, {
            args: { seconds: wait },
            lang: userLanguage,
          }) || `Too many requests. Please wait ${wait}s.`,
        );
      }

      // Store values to wizard state
      ctx.scene.state.chatID = chatId;
      ctx.scene.state.telegramNickname = telegramNickname;

      // Enter the disconnect wizard scene
      await ctx.scene.enter('disconnectTg');
    });

    this.bot.command(TelegramCommandsEnum.SUPPORT, async (ctx: any) => {
      const chatId: number = ctx?.update?.message?.from?.id;
      const telegramNickname: string = ctx?.update?.message?.chat?.username;
      let userLanguage = ctx?.update?.message?.from?.language_code;
      const supportLink =
        this.configService.get(configServiceKeys.TELEGRAM_SUPPORT_LINK) || '';

      if (!chatId) {
        await ctx.reply(`${BOT_MESSAGES.ERROR.GENERAL}`);
        return;
      }

      const isLimited = await this.telegramRateLimiter.isLimited(
        chatId.toString(),
        NotificationBotService.name,
      );

      if (isLimited) {
        const wait = Math.ceil(
          (await this.telegramRateLimiter.getRemainingTTL(
            chatId.toString(),
            NotificationBotService.name,
          )) / 1000,
        );

        return ctx.reply(
          this.i18n?.t(I18nKeys.ERRORS_TELEGRAM_RATE_LIMIT_EXCEEDED, {
            args: { seconds: wait },
            lang: userLanguage,
          }) || `Too many requests. Please wait ${wait}s.`,
        );
      }

      // Store values to wizard state
      ctx.scene.state.chatID = chatId;
      ctx.scene.state.telegramNickname = telegramNickname;

      const user: null | User = await this.userRepository.findUserByProperty(
        UserSearchPath.TelegramChatId,
        chatId,
      );

      if (user) {
        userLanguage = user?.language;
      }

      await ctx.reply(
        this.i18n.t(I18nKeys.MESSAGES_TELEGRAM_CONTACT_SUPPORT, {
          args: { supportLink },
          lang: userLanguage,
        }) ||
          `Didn't find answer to your question? Reach our support ${supportLink}`,
      );
    });

    this.bot.hears('💻 Trellify Website', async (ctx: any) => {
      await ctx.reply(
        `[💻 Trellify Website](${this.configService.get(
          configServiceKeys.LANDING_LINK,
        )})\n`,
        { parse_mode: 'Markdown' },
      );
    });

    this.bot.hears('⚙️ Trellify Configuration', async (ctx: any) => {
      await ctx.reply(
        `[⚙️ Trellify Configuration](${this.configService.get(
          configServiceKeys.FRONTEND_LINK,
        )})\n`,
        { parse_mode: 'Markdown' },
      );
    });

    this.bot.on('callback_query', async (ctx: any) => {
      const data = ctx?.update?.callback_query?.data;
      const [action, webhookId, chatID] = data.split(':');
      const userID = ctx?.update?.callback_query?.from?.id;

      if (!userID || !chatID) return;

      try {
        switch (action) {
          case 'toggleWebhook':
            return await this.handleToggleWebhook(ctx, webhookId, chatID);
          case 'saveWebhooks':
            return await this.handleSaveWebhooks(ctx, chatID);
          case 'cancelWebhooks':
            return await this.handleCancelWebhooks(ctx, chatID);
          default:
            return ctx.answerCbQuery('❌ Unknown action.');
        }
      } catch (error) {
        console.error(`❌ Callback handler error: ${error}`);
        return ctx.answerCbQuery('❌ An unexpected error occurred.');
      }
    });

    // this.bot.on('callback_query', async (ctx: any) => {
    //   const data = ctx?.update?.callback_query?.data;
    //   const [action, webhookId, chatID] = data.split(':');
    //   const userID = ctx?.update?.callback_query?.from?.id;

    //   if (!userID || !chatID) return;

    //   const redisKey = `webhook_selection:${userID}:${chatID}`;

    //   if (action === 'toggleWebhook') {
    //     const rawValue = await this.redisService.getValue(redisKey);
    //     let selection: Set<string> = new Set();

    //     if (rawValue) {
    //       try {
    //         selection = new Set(JSON.parse(rawValue));
    //       } catch (err) {
    //         console.warn(
    //           `Failed to parse selection from Redis: ${rawValue}`,
    //           err,
    //         );
    //       }
    //     }

    //     if (selection.has(webhookId)) {
    //       selection.delete(webhookId);
    //     } else {
    //       selection.add(webhookId);
    //     }

    //     await this.redisService.setValue(
    //       redisKey,
    //       JSON.stringify(Array.from(selection)),
    //     );

    //     // Rebuild the keyboard with updated ✅ statuses
    //     const user = await this.userRepository.findUserByProperty(
    //       UserSearchPath.TelegramChatId,
    //       userID,
    //     );
    //     const webhooks = user.trello.webhooks;

    //     const keyboard = webhooks.map((webhook) => {
    //       const isSelected = selection.has(webhook.webhookId);
    //       return [
    //         {
    //           text: `${isSelected ? '✅ ' : ''}${webhook.modelName}`,
    //           callback_data: `toggleWebhook:${webhook.webhookId}:${chatID}`,
    //         },
    //       ];
    //     });

    //     keyboard.push([
    //       { text: '💾 Save', callback_data: `saveWebhooks:null:${chatID}` },
    //       { text: '❌ Cancel', callback_data: `cancelWebhooks:null:${chatID}` },
    //     ]);

    //     await ctx.editMessageReplyMarkup({ inline_keyboard: keyboard });
    //     return ctx.answerCbQuery('✅ Updated selection.');
    //   }

    //   // Toggle webhook
    //   // if (action === 'toggleWebhook') {
    //   //   const rawValue = await this.redisService.getValue(redisKey);
    //   //   let selection: Set<string> = new Set();

    //   //   if (rawValue) {
    //   //     try {
    //   //       selection = new Set(JSON.parse(rawValue));
    //   //     } catch (err) {
    //   //       console.warn(
    //   //         `Failed to parse selection from Redis: ${rawValue}`,
    //   //         err,
    //   //       );
    //   //     }
    //   //   }

    //   //   if (selection.has(webhookId)) {
    //   //     selection.delete(webhookId);
    //   //   } else {
    //   //     selection.add(webhookId);
    //   //   }

    //   //   await this.redisService.setValue(
    //   //     redisKey,
    //   //     JSON.stringify(Array.from(selection)),
    //   //   );

    //   //   return ctx.answerCbQuery('✅ Updated selection.');
    //   // }

    //   // Save webhooks
    //   if (action === 'saveWebhooks') {
    //     const rawValue = await this.redisService.getValue(redisKey);
    //     const selection = rawValue ? JSON.parse(rawValue) : [];

    //     if (selection.length > 0) {
    //       console.log(`Saving selection for user ${userID}:`, selection);

    //       await this.redisService.deleteValue(redisKey);

    //       // TODO: Call your service method here to update selected webhooks in DB
    //       // await this.trelloWebhooksLogicService.updateTelegramChannelsForUser(userID, Number(chatID), selection);

    //       await ctx.editMessageText('✅ Your webhook settings were saved.');
    //     } else {
    //       await ctx.answerCbQuery('⚠️ Please select at least one webhook.');
    //     }

    //     return;
    //   }

    //   // Cancel selection
    //   if (action === 'cancelWebhooks') {
    //     await this.redisService.deleteValue(redisKey);
    //     await ctx.editMessageText('❌ Selection cancelled.');
    //     return;
    //   }
    // });
  }

  async sendMessageToUser(
    telegramInfo: TelegramSettings,
    message: string,
    html?: boolean,
    replyMarkup?: any,
  ) {
    try {
      if (telegramInfo.chatId) {
        const parseMode = html ? 'HTML' : 'Markdown';
        await this.bot.telegram.sendMessage(telegramInfo.chatId, message, {
          parse_mode: parseMode,
          reply_markup: replyMarkup?.inline_keyboard
            ? replyMarkup
            : { inline_keyboard: replyMarkup },
        });
      }
    } catch (err) {
      this.logger.warn(
        `Telegram message was not sent to ${telegramInfo.username}:`,
        err.response.description,
      );
    }
  }

  async sendMessageToChannel(
    channelId: number,
    message: string,
    html?: boolean,
    replyMarkup?: any,
  ) {
    try {
      if (channelId) {
        const parseMode = html ? 'HTML' : 'Markdown';
        await this.bot.telegram.sendMessage(channelId, message, {
          parse_mode: parseMode,
          reply_markup: replyMarkup?.inline_keyboard
            ? replyMarkup
            : { inline_keyboard: replyMarkup },
        });
      }
    } catch (err) {
      this.logger.warn(
        `Telegram message was not sent to channel ${channelId}:`,
        err.response.description,
      );
    }
  }

  async fetchTelegramUser(chatId: number): Promise<any> {
    try {
      const response = await axios.get(
        `https://api.telegram.org/bot${this.configService.get(
          configServiceKeys.TELEGRAM_NOTIFICATION_BOT_TOKEN,
        )}/getChat`,
        { params: { chat_id: chatId } },
      );
      return response.data.result;
    } catch (err) {
      this.logger.error(err.response ? err.response?.message : err.message);
    }
  }

  private async handleToggleWebhook(
    ctx: any,
    webhookId: string,
    chatID: string,
  ) {
    const userID = ctx?.update?.callback_query?.from?.id;
    if (!userID || !chatID) return;

    const redisKey = `webhook_selection:${userID}:${chatID}`;
    const rawValue = await this.redisService.getValue(redisKey);
    let selection: Set<string> = new Set();

    if (rawValue) {
      try {
        selection = new Set(JSON.parse(rawValue));
      } catch (err) {
        console.warn(`Failed to parse selection from Redis: ${rawValue}`, err);
      }
    }

    if (selection.has(webhookId)) {
      selection.delete(webhookId);
    } else {
      selection.add(webhookId);
    }

    await this.redisService.setValue(
      redisKey,
      JSON.stringify(Array.from(selection)),
    );

    // Rebuild the keyboard
    const user = await this.userRepository.findUserByProperty(
      UserSearchPath.TelegramChatId,
      userID,
    );
    const webhooks = user.trello.webhooks;

    const keyboard = webhooks.map((webhook) => {
      const isSelected = selection.has(webhook.webhookId);
      return [
        {
          text: `${isSelected ? '✅ ' : ''}${webhook.modelName}`,
          callback_data: `toggleWebhook:${webhook.webhookId}:${chatID}`,
        },
      ];
    });

    keyboard.push([
      { text: '💾 Save', callback_data: `saveWebhooks:null:${chatID}` },
      { text: '❌ Cancel', callback_data: `cancelWebhooks:null:${chatID}` },
    ]);

    await ctx.editMessageReplyMarkup({ inline_keyboard: keyboard });
    return ctx.answerCbQuery('✅ Updated selection.');
  }

  private async handleSaveWebhooks(ctx: any, chatID: string) {
    const userID = ctx?.update?.callback_query?.from?.id;
    if (!userID || !chatID) return;

    const redisKey = `webhook_selection:${userID}:${chatID}`;
    const rawValue = await this.redisService.getValue(redisKey);
    const selection: string[] = rawValue ? JSON.parse(rawValue) : [];

    if (selection.length > 0) {
      // TODO: Implement actual update logic
      // await this.trelloWebhooksLogicService.updateTelegramChannelsForUser(userID, Number(chatID), selection);

      console.log(selection);
      await this.redisService.deleteValue(redisKey);
      await ctx.editMessageText('✅ Your webhook settings were saved.');
    } else {
      await ctx.answerCbQuery('⚠️ Please select at least one webhook.');
    }
  }

  private async handleCancelWebhooks(ctx: any, chatID: string) {
    const userID = ctx?.update?.callback_query?.from?.id;
    if (!userID || !chatID) return;

    const redisKey = `webhook_selection:${userID}:${chatID}`;
    await this.redisService.deleteValue(redisKey);

    await ctx.editMessageText('❌ Selection cancelled.');
  }
}
