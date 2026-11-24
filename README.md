# Trellify

Trellify is a Telegram and Discord notification bot for Trello. It watches boards through Trello webhooks and delivers activity to a private chat or to a connected group channel.

Users connect a Trello account, subscribe a board, and choose which card, checklist, list, and board events to receive. Messages go out through the Telegram notification bot and the Discord bot. A separate Telegram bot sends admin alerts.

## What it does

- Receives Trello webhook events for cards, checklists, lists, and boards
- Sends those events to Telegram chats and Discord channels
- Lets a user pick a notification profile and turn individual events on or off
- Connects Telegram groups and Discord channels to a board
- Handles accounts, email confirmation, and PayPal subscriptions

## Stack

| Item | Name |
| --- | --- |
| Framework | NestJS |
| Database | MongoDB with Mongoose |
| Cache | Redis |
| Bots | Telegraf (Telegram), Discord.js |
| Package manager | npm |

## Setup

Create an env file for the stage you are running:

- development: `.env.development`
- tests with Docker Compose: `.env.test`
- staging: `.env.staging`
- production: `.env.production`

Start the app with Docker Compose. Replace `<your_stage>` with `development`, `test`, `staging`, or `production`.

```bash
STAGE=<your_stage> docker compose --env-file .env.<your_stage> up -d --build
```

Local commands:

```bash
npm install
npm run start:dev
```

Database only:

```bash
npm run db:up
npm run db:down
```

## Environment

| Env | Description |
| --- | --- |
| **App settings** | |
| NODE_ENV | `development`, `staging`, or `production` |
| BACKEND_HOST_PORT | External port used when running the app via Docker |
| BACKEND_PORT | Port the app listens on |
| BACKEND_LINK | Public URL of this API |
| FRONTEND_LINK | Public URL of the frontend |
| LANDING_LINK | Public URL of the landing site |
| DATE_FORMAT | Date format, for example `dd-MM-yyyy` |
| API_REQUEST_LIMIT | Allowed number of requests per window |
| API_REFRESH_LIMIT_TIME | Request-limit window, in seconds |
| **Database** | |
| MONGODB_DATABASE | MongoDB database name |
| MONGODB_PORT | MongoDB port |
| MONGODB_HOSTNAME | MongoDB host |
| MONGODB_USERNAME | MongoDB user |
| MONGODB_PASSWORD | MongoDB password |
| MONGODB_URI | MongoDB connection URI |
| MONGODB_SUPERADMIN_EMAIL | Email for the database superadmin account |
| MONGODB_SUPERADMIN_PASSWORD | Password for the database superadmin account |
| **Redis** | |
| REDIS_HOST_PORT | Redis port published by Docker |
| REDIS_PORT | Redis port inside the network, usually `6379` |
| REDIS_HOST | Redis host |
| REDIS_PASSWORD | Redis password |
| **JWT** | |
| JWT_EXPIRES_IN | Access-token lifetime, for example `7d` |
| JWT_SECRET | Secret used to sign access tokens |
| JWT_EXPIRES_CONFIRMATIONS | Lifetime of confirmation and password-reset tokens |
| **Encryption** | |
| ENCRYPTION_KEY | Key used to encrypt stored secrets such as Trello tokens |
| **Mailer** | |
| ADMIN_MAIL | Inbox that receives user emails |
| MAILER_SENDER | Address used to send mail |
| MAILER_PASSWORD | Password for the mail account |
| MAILER_HOST | SMTP host |
| MAILER_PORT | SMTP port |
| **Trello** | |
| TRELLO_API_KEY | Trello API key |
| **Telegram** | |
| TELEGRAM_NOTIFICATION_BOT_TOKEN | Token for the user notification bot |
| TELEGRAM_ADMIN_BOT_TOKEN | Token for the admin notification bot |
| TELEGRAM_SUPPORT_LINK | Link to live support |
| **Discord** | |
| DISCORD_BOT_TOKEN | Token for the Discord notification bot |
| DISCORD_DEVELOPMENT_GUILD_ID | Discord server id used while authorizing the bot |
| **PayPal** | |
| PAYPAL_CLIENT_ID | PayPal merchant client id |
| PAYPAL_CLIENT_SECRET | PayPal merchant secret |
| PAYPAL_API_URL | PayPal API URL |
