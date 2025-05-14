export enum UserSearchPath {
  // Nested paths for 'trello' object
  TrelloUserId = 'trello.userId',
  TrelloUsername = 'trello.username',
  TrelloToken = 'trello.token',
  TrelloWebhooks = 'trello.webhooks',
  TrelloWebhooksIds = 'trello.webhooks.webhookId',
  TrelloWebhooksModelName = 'trello.webhooks.modelName',
  TrelloWebhooksIdModel = 'trello.webhooks.idModel',

  // Nested paths for 'telegram' object
  TelegramUsername = 'telegram.username',
  TelegramChatId = 'telegram.chatId',

  // Nested paths for 'discord' object
  DiscordUsername = 'discord.username',
  DiscordUserId = 'discord.userId',

  //Subscription
  SubscriptionPlan = 'subscription.plan',
  SubscriptionExpired = 'subscription.expired',
  SubscriptionLastPayment = 'subscription.lastPaymentDate',
  SubscriptionNextPayment = 'subscription.nextPaymentDate',
  LastPaymentId = 'subscription.lastPaymentId',
  PaypalSubscriptionId = 'subscription.paypalSubscriptionId',

  // Simple properties
  Email = 'email',
  Role = 'role',
}
