## Trello notification backend

## Overview

| Item            | Name                                                           |
|-----------------|----------------------------------------------------------------|
| Package Manager | npm: `npm install` -> `npm build` -> `npm start` - recommended |
| Framework       | NestJs                                                         |
| Database        | MongoDB                                                        |
| ODM             | Mongoose                                                       |

## ENV

| Env                           | Description                                                     |
|-------------------------------|-----------------------------------------------------------------|
| **App settings:**             |                                                                 |             
| NODE_ENV                   | Specifies the environment: development, staging, or production. |
| BACKEND_PORT                  | The port on which the backend server listens.                   |
| BACKEND_HOST_PORT             | The port exposed on the host machine.                           |
| BACKEND_LINK                  | URL for the backend's external link.                            |
| **Database settings:**        |                                                                 |
| MONGODB_URI                   | The connection URI for the MongoDB database.                    |
| MONGODB_USERNAME              | Username for authenticating with MongoDB.                       |
| MONGODB_PASSWORD              | Password for authenticating with MongoDB.                       |
| MONGODB_SUPERADMIN_EMAIL      | Email for the database's superadmin account.                    |
| MONGODB_SUPERADMIN_PASSWORD   | Password for the database's superadmin account.                 |
| **JWT settings:**             |                                                                 |
| JWT_EXPIRES_IN                | Token expiration duration (e.g., "7d" for 7 days).              |
| JWT_SECRET                    | Secret key used for signing JWT tokens.                         |
| **Encryption settings:**      |                                                                 |
| ENCRYPTION_KEY                | Secret key used for signing JWT tokens.                         |
| **Mailer settings:**          |                                                                 |
| MAILER_SENDER                 | The email address used for sending emails.                      |
| MAILER_PASSWORD               | Password for the mailer's account.                              |
| MAILER_HOST                   | Host of the email service provider.                             |
| MAILER_PORT                   | Port for the mailer's SMTP server.                              |
| **Trello settings:**          |                                                                 |
| TRELLO_API_KEY                | API key for interacting with Trello.                            |
