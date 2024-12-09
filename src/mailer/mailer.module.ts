/* eslint-disable require-await */
import { Module, Logger } from '@nestjs/common';
import { MailerService } from './services/mailer.service';
import { MailerModule as NodeMailerModule } from '@nestjs-modules/mailer';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { configServiceEnum } from 'src/common/enums/config.service.enum';


@Module({
  imports: [
    NodeMailerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        transport: {
          host: configService.get<string>(configServiceEnum.MAILER_HOST),
          port: configService.get<number>(configServiceEnum.MAILER_PORT),
          secure: false,
          auth: {
            user: configService.get<string>(configServiceEnum.MAILER_SENDER),
            pass: configService.get<string>(configServiceEnum.MAILER_PASSWORD),
          },
          authMethod: 'PLAIN',
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [],
  providers: [MailerService, Logger],
  exports: [MailerService],
})
export class MailerModule {}
