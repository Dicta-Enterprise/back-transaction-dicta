import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { envs } from './config/envs';
import { Logger, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const logger = new Logger('API');

  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');

app.enableCors({
    origin: 'https://localhost:4200',
    credentials: true,
    methods: 'GET,PUT,POST,DELETE,PATCH',
  }); 

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('API Universo Dicta')
    .setDescription('API de la aplicacion de universo dicta')
    .setVersion('1.0')
    // .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);


  await app.listen(envs.port);

  logger.log(`api corriendo en el puerto ${envs.port}`);
  logger.log(`api corriendo en la bd ${envs.databaseUrl}`);
}
bootstrap();
