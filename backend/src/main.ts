import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Global validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // CORS for Angular dev server + Keycloak
  app.enableCors({
    origin: [
      'http://localhost:4200',
      'http://localhost:4300',
      'http://localhost:8080', // Keycloak
    ],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  // Swagger with Bearer auth
  const config = new DocumentBuilder()
    .setTitle('Spree API')
    .setDescription(
      'Event route planner backend — compute optimized event-visiting sprees.\n\n' +
      '**Authentication**: Keycloak OIDC — obtain a token from ' +
      '`http://localhost:8080/realms/spree/protocol/openid-connect/token`\n\n' +
      '**Test users**: alice/alice123 (user), bob/bob123 (organizer), admin/admin123 (admin)',
    )
    .setVersion('2.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Keycloak access token',
      },
      'bearer',
    )
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env['PORT'] || 3000;
  await app.listen(port);
  console.log(`🎉 Spree API running on http://localhost:${port}`);
  console.log(`📚 Swagger docs at http://localhost:${port}/api/docs`);
  console.log(`🔐 Keycloak expected at ${process.env['KEYCLOAK_URL'] || 'http://localhost:8080'}`);
}

bootstrap();
