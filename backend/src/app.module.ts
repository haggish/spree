import { Module } from '@nestjs/common';
import { AuthModule } from './auth';
import { VenuesModule } from './venues/venues.module';
import { EventsModule } from './events/events.module';
import { RoutesModule } from './routes/routes.module';
import { SavedSpreesModule } from './saved-sprees/saved-sprees.module';

@Module({
  imports: [
    AuthModule,
    VenuesModule,
    EventsModule,
    RoutesModule,
    SavedSpreesModule,
  ],
})
export class AppModule {}
