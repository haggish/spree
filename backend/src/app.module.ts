import { Module } from '@nestjs/common';
import { AuthModule } from './auth';
import { VenuesModule } from './venues/venues.module';
import { EventsModule } from './events/events.module';
import { RoutesModule } from './routes/routes.module';
import { SavedSpreesModule } from './saved-sprees/saved-sprees.module';
import { EventGroupsModule } from './event-groups/event-groups.module';

@Module({
  imports: [
    AuthModule,
    VenuesModule,
    EventGroupsModule,
    EventsModule,
    RoutesModule,
    SavedSpreesModule,
  ],
})
export class AppModule {}
