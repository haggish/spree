import { Module } from '@nestjs/common';
import { EventsController } from './events.controller';
import { EventsService } from './events.service';
import { VenuesModule } from '../venues/venues.module';
import { EventGroupsModule } from '../event-groups/event-groups.module';
import { IndexBerlinModule } from '../index-berlin/index-berlin.module';

@Module({
  imports: [VenuesModule, EventGroupsModule, IndexBerlinModule],
  controllers: [EventsController],
  providers: [EventsService],
  exports: [EventsService],
})
export class EventsModule {}
