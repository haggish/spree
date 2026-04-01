import { Module } from '@nestjs/common';
import { SpreeController } from './spree.controller';
import { SpreeService } from './spree.service';
import { GoogleRoutesService } from './google-routes.service';
import { RouteOptimizerService } from './route-optimizer.service';
import { EventsModule } from '../events/events.module';

@Module({
  imports: [EventsModule],
  controllers: [SpreeController],
  providers: [SpreeService, GoogleRoutesService, RouteOptimizerService],
  exports: [SpreeService],
})
export class RoutesModule {}
