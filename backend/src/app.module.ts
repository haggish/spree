import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth';
import { VenuesModule } from './venues/venues.module';
import { EventsModule } from './events/events.module';
import { RoutesModule } from './routes/routes.module';
import { SavedSpreesModule } from './saved-sprees/saved-sprees.module';
import { EventGroupsModule } from './event-groups/event-groups.module';
import { SavedSpreeEntity } from './saved-sprees/saved-spree.entity';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: process.env['DATABASE_URL'] || 'postgres://spree:spree@localhost:5432/spree',
      entities: [SavedSpreeEntity],
      synchronize: true,
    }),
    AuthModule,
    VenuesModule,
    EventGroupsModule,
    EventsModule,
    RoutesModule,
    SavedSpreesModule,
  ],
})
export class AppModule {}
