import { ValidationPipe, VersioningType } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import compression from 'compression';
import { Logger } from 'nestjs-pino';
import { AppClusterService } from './app-cluster.service';
import { AppModule } from './app.module';

async function bootstrap() {
  // Create NestJS application
  const app = await NestFactory.create(AppModule);
  const logger = app.get(Logger);
  app.useLogger(logger);

  // Apply middleware
  app.use(compression());

  // Setup validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Setup CORS
  app.enableCors({
    origin: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  });

  // API versioning
  app.enableVersioning({
    type: VersioningType.URI,
    prefix: 'api/v',
    defaultVersion: '1',
  });

  // Swagger documentation (dev only)
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('Employee Organogram API')
      .setDescription('API for managing employee hierarchies')
      .setVersion('1.0')
      .addBearerAuth()
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api', app, document);
  }

  // Enable graceful shutdown
  app.enableShutdownHooks();

  // Start the server
  const port = process.env.PORT || 8000;
  await app.listen(port);
  logger.log(`Application running on port ${port}`);
}

// Start the application
AppClusterService.clusterize(bootstrap);
