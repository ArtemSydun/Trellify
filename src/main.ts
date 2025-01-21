import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { I18nMiddleware } from 'nestjs-i18n';
import { AppModule } from './app.module';
import { configServiceEnum } from './common/enums/config.service.enum';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(new ValidationPipe());
  app.use(I18nMiddleware);
  const configService = app.get(ConfigService);
  const logger = new Logger('Bootstrap');

  app.enableCors({
    origin: '*', // Allow all origins, only for testing purposes, change later
  });

  if (configService.get(configServiceEnum.NODE_ENV) !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('Trello notification bot')
      .setDescription('Trello bot description')
      .setVersion('1.0')
      .addBearerAuth({
        type: 'http',
        scheme: 'bearer',
        in: 'header',
      })
      .build();
    const documentFactory = () => SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('docs', app, documentFactory);

    logger.log(
      `Application docs is running on ${configService.get(configServiceEnum.BACKEND_LINK)}/docs`,
    );
  }

  const BACKEND_PORT =
    configService.get(configServiceEnum.BACKEND_PORT) || 3005;
  await app.listen(BACKEND_PORT);
  logger.log(
    `Application is running on ${configService.get(configServiceEnum.BACKEND_LINK)}`,
  );
}
bootstrap();
