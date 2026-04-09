import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { AuthModule } from './auth';
import { VenuesModule } from './venues/venues.module';
import { EventsModule } from './events/events.module';
import { RoutesModule } from './routes/routes.module';
import { SavedSpreesModule } from './saved-sprees/saved-sprees.module';
import { EventGroupsModule } from './event-groups/event-groups.module';
import { SavedSpreeEntity } from './saved-sprees/saved-spree.entity';

const dbUrl = process.env['DATABASE_URL'];
const isProduction = process.env['NODE_ENV'] === 'production';

// Only import TypeORM + SavedSprees when a database is available
const optionalImports = dbUrl
  ? [
      TypeOrmModule.forRoot({
        type: 'postgres',
        url: dbUrl,
        entities: [SavedSpreeEntity],
        synchronize: !isProduction,
      }),
      SavedSpreesModule,
    ]
  : [];

@Module({
  imports: [
    ...optionalImports,
    ThrottlerModule.forRoot({
      throttlers: [{ ttl: 60000, limit: 30 }],
    }),
    AuthModule,
    VenuesModule,
    EventGroupsModule,
    EventsModule,
    RoutesModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
