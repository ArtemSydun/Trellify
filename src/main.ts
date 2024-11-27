import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { configServiceEnum } from './common/enums/config.service.enum';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(new ValidationPipe());
  const configService = app.get(ConfigService);
  const logger = new Logger('Bootstrap');

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

  await app.listen(configService.get(configServiceEnum.PORT) ?? 3005);
  logger.log(`Application is running on http://localhost:${configService.get(configServiceEnum.PORT)}`);
  logger.log(`Application docs is running on http://localhost:${configService.get(configServiceEnum.PORT)}/docs`)

}
bootstrap();
