import { UserRoles } from '../enums/role.enum';

export const userStub = () => {
  const fixedDate = new Date('2025-01-03T13:38:58.285Z');

  return {
    id: 'd3e634ce-5a5f-4b6d-9aef-f35a68543743',
    email: 'test@gmail.com',
    password: '$2b$10$lGGZKO1AHqLPDEfwP6u5leQZVU0vA9cfqctkibaAZbyfCbkSUqqlG',
    role: UserRoles.admin,
    trello: {
      userId: '674ec752cba1224342f87c20',
      username: 'artem11123',
      webhooks: [
        {
          idModel: '6763dcb33e9016a37e973222',
          modelName: 'test',
          webhookId: '67692151f8ed7956d9323222',
        },
        {
          idModel: '6763dcb33e9016a37e973222',
          modelName: 'test',
          webhookId: '676a7a16fc88f6d9ba673222',
        },
      ],
      token:
        '222sdGVkX19NVU2j8aOHpt1R0D8+nTynmFeZnnFDzDYbYMoTO08c1fq6NM4oFQzkC0TV6U87nCwj4ACu80AHr7y6SKCkumsF344ystozVEQwHCsgWGxa+6mDi/HvM81/',
    },
    telegram: {
      chatId: 123,
      username: 'tgusername',
      updatedAt: fixedDate,
    },
  };
};
