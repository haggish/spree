import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth';
import { VenuesModule } from './venues/venues.module';
import { EventsModule } from './events/events.module';
import { RoutesModule } from './routes/routes.module';
import { SavedSpreesModule } from './saved-sprees/saved-sprees.module';
import { EventGroupsModule } from './event-groups/event-groups.module';
import { SavedSpreeEntity } from './saved-sprees/saved-spree.entity';

const dbUrl = process.env['DATABASE_URL'];

// Only import TypeORM + SavedSprees when a database is available
const optionalImports = dbUrl
  ? [
      TypeOrmModule.forRoot({
        type: 'postgres',
        url: dbUrl,
        entities: [SavedSpreeEntity],
        synchronize: true,
      }),
      SavedSpreesModule,
    ]
  : [];

@Module({
  imports: [
    ...optionalImports,
    AuthModule,
    VenuesModule,
    EventGroupsModule,
    EventsModule,
    RoutesModule,
  ],
})
export class AppModule {}
