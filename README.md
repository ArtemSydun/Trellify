# Trellify api

## Setup

### Create .env for needed stage

For development - **.env.development**

For tests if you use docker compose - **.env.test**

For staging - **.env.staging**

For production - **.env.production**

### Start App with Docker Compose (Change <your_stage>)

```
STAGE=<your_stage> docker compose --env-file .env.<your_stage> up -d --build
```

## Overview

| Item            | Name                                                           |
| --------------- | -------------------------------------------------------------- |
| Package Manager | npm: `npm install` -> `npm build` -> `npm start` - recommended |
| Framework       | NestJs                                                         |
| Database        | MongoDB                                                        |
| ODM             | Mongoose                                                       |

## ENV

| Env                             | Description                                                                   |
| ------------------------------- | ----------------------------------------------------------------------------- |
| **App settings:**               |                                                                               |
| NODE_ENV                        | Specifies the environment: development, staging, or production.               |
| BACKEND_HOST_PORT               | The port on the host machine that forwards traffic to the backend container.  |
| BACKEND_PORT                    | The internal port inside the container where the backend application listens. |
| BACKEND_LINK                    | URL for the backend's external link.                                          |
| FRONTEND_LINK                   | URL for the frontend's external link.                                         |
| LANDING_LINK                    | URL for the website landing.                                                  |
| DATE_FORMAT                     | Date format (dd-MM-yyyy for example).                                         |
| API_REQUEST_LIMIT               | Allowed number of requests per certain period of time.                        |
| API_REFRESH_LIMIT_TIME          | Requests limit refresh time (in seconds).                                     |
| **Database settings:**          |                                                                               |
| MONGODB_PORT                    | The port on which MongoDB is accessible for connections.                      |
| MONGODB_HOSTNAME                | The hostname or IP address of the server where MongoDB is running.            |
| MONGODB_USERNAME                | Username for authenticating with MongoDB.                                     |
| MONGODB_PASSWORD                | Password for authenticating with MongoDB.                                     |
| MONGODB_URI                     | The connection URI for the MongoDB database.                                  |
| MONGODB_SUPERADMIN_EMAIL        | Email for the database's superadmin account.                                  |
| MONGODB_SUPERADMIN_PASSWORD     | Password for the database's superadmin account.                               |
| **JWT settings:**               |                                                                               |
| JWT_EXPIRES_IN                  | Token expiration duration (e.g., "7d" for 7 days).                            |
| JWT_SECRET                      | Secret key used for signing JWT tokens.                                       |
| JWT_EXPIRES_CONFIRMATIONS       | The expiration time for password reset JWT tokens.                            |
| **Encryption settings:**        |                                                                               |
| ENCRYPTION_KEY                  | Secret key used for signing JWT tokens.                                       |
| **Mailer settings:**            |                                                                               |
| ADMIN_MAIL                      | The email address used for receiving users emails.                            |
| MAILER_SENDER                   | The email address used for sending emails.                                    |
| MAILER_PASSWORD                 | Password for the mailer's account.                                            |
| MAILER_HOST                     | Host of the email service provider.                                           |
| MAILER_PORT                     | Port for the mailer's SMTP server.                                            |
| **Trello settings:**            |                                                                               |
| TRELLO_API_KEY                  | API key for interacting with Trello.                                          |
| **Telegram settings:**          |                                                                               |
| TELEGRAM_NOTIFICATION_BOT_TOKEN | Telegram bot token for user notifications                                     |
| TELEGRAM_ADMIN_BOT_TOKEN        | Telegram bot token for admin notifications                                    |
