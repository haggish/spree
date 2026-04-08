import { Module } from '@nestjs/common';
import { EventGroupsController } from './event-groups.controller';
import { EventGroupsService } from './event-groups.service';
import { VenuesModule } from '../venues/venues.module';
import { IndexBerlinModule } from '../index-berlin/index-berlin.module';
import { KulturdatenBerlinModule } from '../kulturdaten-berlin/kulturdaten-berlin.module';

@Module({
  imports: [VenuesModule, IndexBerlinModule, KulturdatenBerlinModule],
  controllers: [EventGroupsController],
  providers: [EventGroupsService],
  exports: [EventGroupsService],
})
export class EventGroupsModule {}
