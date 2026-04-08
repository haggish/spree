import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { EventGroupsModule } from '../src/event-groups/event-groups.module';
import { EventsModule } from '../src/events/events.module';
import { RoutesModule } from '../src/routes/routes.module';

/**
 * Create a test NestJS application with the core modules loaded.
 * Skips AuthModule (Keycloak), TypeORM, and SavedSprees — those need
 * external services. All @Public() endpoints work without auth guards.
 */
export async function createTestApp(): Promise<INestApplication> {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [EventGroupsModule, EventsModule, RoutesModule],
  }).compile();

  const app = moduleFixture.createNestApplication();

  // Mirror the ValidationPipe from main.ts
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  await app.init();
  return app;
}
