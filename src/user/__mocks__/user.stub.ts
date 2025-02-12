import { Languages } from 'src/common/enums/languages.enum';
import { UserRoles } from '../enums/role.enum';

export const superAdminStub = () => {
  const fixedDate = new Date('2025-01-03T13:38:58.285Z');

  return {
    id: 'd3e634ce-5a5f-4b6d-9aef-f35a68543743',
    email: 'test@gmail.com',
    password: '$2b$10$lGGZKO1AHqLPDEfwP6u5leQZVU0vA9cfqctkibaAZbyfCbkSUqqlG',
    role: UserRoles.superadmin,
    trello: {
      userId: '674ec752cba1224342f87c20',
      username: 'artem11123',
      webhooks: [
        {
          idModel: '6763dcb33e9016a37e973222',
          modelName: 'test',
          webhookId: 'webhook1',
        },
        {
          idModel: '6763dcb33e9016a37e973223',
          modelName: 'test1',
          webhookId: 'webhook2',
        },
      ],
      token:
        'encrypted222sdGVkX19NVU2j8aOHpt1R0D8+nTynmFeZnnFDzDYbYMoTO08c1fq6NM4oFQzkC0TV6U87nCwj4ACu80AHr7y6SKCkumsF344ystozVEQwHCsgWGxa+6mDi/HvM81/',
    },
    telegram: {
      chatId: 123,
      username: 'tgusername',
      updatedAt: fixedDate,
    },
    language: Languages.EN,
    timezone: 2,
    createdAt: fixedDate,
    updatedAt: fixedDate,
    lastLoginDate: fixedDate,
    lastActivityDate: fixedDate,
  };
};

export const userStub = () => {
  const fixedDate = new Date('2025-01-04T13:38:58.285Z');

  return {
    id: 'd3e634ce-5a5f-4b6d-9aef-f35a68543744',
    email: 'test1@gmail.com',
    password: '$2b$10$lGGZKO1AHqLPDEfwP6u5leQZVU0vA9cfqctkibaAZbyfCbkSUqqlG',
    role: UserRoles.user,
    trello: {
      userId: '674ec752cba1224342f87c21',
      username: 'artem11124',
      webhooks: [
        {
          idModel: '6763dcb33e9016a37e973222',
          modelName: 'test',
          webhookId: 'webhook1',
        },
        {
          idModel: '6763dcb33e9016a37e973223',
          modelName: 'test1',
          webhookId: 'webhook2',
        },
      ],
      token:
        'encrypted222sdGVkX19NVU2j8aOHpt1R0D8+nTynmFeZnnFDzDYbYMoTO08c1fq6NM4oFQzkC0TV6U87nCwj4ACu80AHr7y6SKCkumsF344ystozVEQwHCsgWGxa+6mDi/HvM83/',
    },
    telegram: {
      chatId: 1234,
      username: 'tgusername1',
      updatedAt: fixedDate,
    },
    language: Languages.EN,
    timezone: 2,
    lastLoginDate: fixedDate,
    lastActivityDate: fixedDate,
  };
};
