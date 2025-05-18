import { ValidationPipe, VersioningType } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';




async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Strip properties not defined in DTOs
      transform: true, // Automatically transform payloads
      forbidNonWhitelisted: true, // Throw error if non-whitelisted properties are present
    })
  );

  // Enable CORS
  app.enableCors();

// API versioning
app.enableVersioning({
  type: VersioningType.URI,
  prefix: 'api/v',
  defaultVersion: '1',
});

  // Setup Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('Employee Organogram API')
    .setDescription(
      'API for managing employee hierarchies and organizational structure'
    )
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  await app.listen(process.env.PORT ?? 8000);
}
bootstrap();
