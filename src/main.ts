import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: '*', // Allow all origins for testing (or specify the Trello domain here)
    methods: 'POST',
    allowedHeaders: 'Content-Type, Authorization',
  });
  app.useGlobalPipes(new ValidationPipe());
  const configService = app.get(ConfigService);
  const logger = new Logger('Bootstrap');
  await app.listen(configService.get('PORT') ?? 3005);
  logger.log(`Application is running on http://localhost:${configService.get('PORT')}`);

}
bootstrap();
