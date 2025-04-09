import { Global, Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import { SharedConfigService } from './services/shared.config.service';

@Global()
@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [`.env.${process.env.NODE_ENV}`],
    }),
  ],
  providers: [SharedConfigService],
  exports: [SharedConfigService],
})
export class ConfigModule {}
