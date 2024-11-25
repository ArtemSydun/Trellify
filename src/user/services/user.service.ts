import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { UserRepository } from '../repositories/user.repository';
import { randomUUID } from 'crypto';
import { User } from '../entities/user.entity';
import { hashPassword } from 'src/common/helpers/hashing';
import { MailerService } from 'src/mailer/services/mailer.service';
import { configServiceEnum } from 'src/common/enums/config.service.enum';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class UserService {
  constructor(private readonly userRepository: UserRepository,
    private readonly mailerService: MailerService,
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService
  ) {}

  public async createUser(createUserDto: CreateUserDto) {
    const userByEmail = await this.userRepository.findOneByEmail(
      createUserDto.email,
    );

    if (userByEmail) {
      throw new ConflictException(`User ${createUserDto.email} already exist`);
    }

    const newUser = {
      id: randomUUID(),
      ...createUserDto,
      password: await hashPassword(createUserDto.password),
    };

    return await this.userRepository.create(newUser);
  }

  async findAll(): Promise<User[]> {
    return await this.userRepository.getAll();
  }

  public async findUserById(id: string): Promise<User> {
    const user = await this.userRepository.findOneById(id);

    if (!user) throw new NotFoundException(`User with id ${id} is not found`);

    return user;
  }

  public async findUserByEmail(email: string): Promise<User> {
    const user = await this.userRepository.findOneByEmail(email);

    if (!user)
      throw new NotFoundException(`User with email ${email} is not found`);

    return user;
  }

  public async doesUserExist(email: string): Promise<boolean> {
    return await this.userRepository.existsByEmail(email);
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    return await this.userRepository.updateById(id, updateUserDto);
  }

  public async resetPassword(id: string, newPassword: string): Promise<void> {
    const userToReset = await this.findUserById(id);

    const encryptedPassword = await hashPassword(newPassword);

    await this.userRepository.updateById(userToReset.id, {
      password: encryptedPassword,
    });
  }

  public async initiateUserRegistration(
    createUserDto: CreateUserDto,
  ): Promise<string> {
    const userByEmail = await this.userRepository.findOneByEmail(
      createUserDto.email,
    );
    if (userByEmail) {
      throw new ConflictException(`User ${createUserDto.email} already exists`);
    }
    const payload = {
      email: createUserDto.email,
      password: createUserDto.password,
    };

    const token = this.jwtService.sign(payload, { expiresIn: '1d' });

    const confirmationLink = this.mailerService.getLink(
      this.configService.get(configServiceEnum.HOST),
      this.configService.get(configServiceEnum.PORT),
      `auth/confirm?token=${token}`,
      'Confirm your email',
    );

    await this.mailerService.sendDistribution(
      this.configService.get(configServiceEnum.MAILER_SENDER),
      createUserDto.email,
      {
        subject: 'Confirm Your Email',
        html: `<p>Please confirm your email by clicking the following link: ${confirmationLink}</p>`,
      },
    );

    return `Confirmation link sent to your email ${createUserDto.email}`;
  }
}
