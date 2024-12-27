import { forgotPasswordMessageStub, loginStub, registerMessageStub, resetPasswordMessageStub } from "./auth.stub";

export const MockedAuthService = jest.fn().mockReturnValue({
    login: jest.fn().mockResolvedValue(loginStub()),
    initiateUserRegistration: jest.fn().mockResolvedValue(registerMessageStub()),
    forgotPassword: jest.fn().mockResolvedValue(forgotPasswordMessageStub()),
    resetPassword: jest.fn().mockResolvedValue(resetPasswordMessageStub()),
});