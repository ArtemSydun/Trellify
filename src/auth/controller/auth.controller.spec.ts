import { Test } from "@nestjs/testing";
import { AuthController } from "./auth.controller";
import { AuthService } from "../service/auth.service";
import { UsersService } from "../../user/services/users.service";
import { loginStub } from "../__mocks__/auth.stub";
import { LoginUserDto, LoginUserResponseDto } from "../dto/login.dto";
import { userStub } from "../../user/__mocks__/user.stub";
import { createMock } from "@golevelup/ts-jest";

jest.mock('../service/auth.service.ts');

describe('AuthController', () => {
  let authController: AuthController;
  let authService: AuthService;
  let usersService: UsersService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: createMock<UsersService>({
            findUserByEmail: jest.fn().mockResolvedValue(userStub()),
          }),
        },
      ],
    }).compile();

    authController = moduleRef.get<AuthController>(AuthController);
    authService = moduleRef.get<AuthService>(AuthService);
    usersService = moduleRef.get<UsersService>(UsersService);
  });

  describe('login', () => {
    it('should return accessToken and user object after successful login', async () => {
      const loginUserDto: LoginUserDto = {
        email: "test@gmail.com",
        password: "testpassword",
      };

      jest.spyOn(authService, 'login').mockResolvedValue(loginStub());

      const loginData = await authController.login(loginUserDto);

      expect(loginData).toEqual(loginStub());
      expect(usersService.findUserByEmail).toHaveBeenCalledWith(loginUserDto.email);
    });
  });
});
