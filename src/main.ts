import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { I18nMiddleware } from 'nestjs-i18n';
import { AppModule } from './app.module';
import { configServiceKeys } from './common/enums/config-service-keys.enum';

async function bootstrap() {
  //<NestExpressApplication> This gives you access to Express-specific features like:
  // useStaticAssets() — serving static files (important for your uploads!)
  // setViewEngine() — setting a view engine like Pug, EJS, Handlebars
  // setLocal() — setting locals for templates
  // Express native methods under the hood

  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.set('trust proxy', 'loopback'); // specify a single subnet

  //set of default http security middlewares, check here
  //https://github.com/helmetjs/helmet
  app.use(helmet());

  app.use(I18nMiddleware);
  app.useGlobalPipes(new ValidationPipe());

  const configService = app.get(ConfigService);
  const logger = new Logger('Bootstrap');

  app.enableCors({
    origin:
      configService.get(configServiceKeys.NODE_ENV) === 'production'
        ? [
            configService.get(configServiceKeys.FRONTEND_LINK),
            configService.get(configServiceKeys.LANDING_LINK),
          ]
        : '*',
  });

  if (configService.get(configServiceKeys.NODE_ENV) !== 'production') {
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
      `Application docs is running on ${configService.get(configServiceKeys.BACKEND_LINK)}/docs`,
    );
  }

  const BACKEND_PORT =
    configService.get(configServiceKeys.BACKEND_PORT) || 3005;

  await app.listen(BACKEND_PORT);

  logger.log(
    `Application is running on ${configService.get(configServiceKeys.BACKEND_LINK)}`,
  );
}
bootstrap();
