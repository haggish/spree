import { Module } from '@nestjs/common';
import { EventGroupsController } from './event-groups.controller';
import { EventGroupsService } from './event-groups.service';
import { VenuesModule } from '../venues/venues.module';

@Module({
  imports: [VenuesModule],
  controllers: [EventGroupsController],
  providers: [EventGroupsService],
  exports: [EventGroupsService],
})
export class EventGroupsModule {}
