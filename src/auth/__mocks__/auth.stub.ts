import { superAdminStub } from 'src/user/__mocks__/user.stub';

export const loginStub = () => {
  return {
    accessToken: 'jwttoken',
    user: superAdminStub(),
  };
};
