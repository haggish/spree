import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { EventsService } from '../events/events.service';
import { GoogleRoutesService } from './google-routes.service';
import { RouteOptimizerService, SchedulableEvent } from './route-optimizer.service';
import { ComputeSpreeDto } from '../common/dto';
import {
  LatLng,
  SpreePlan,
  SpreeLeg,
  SpreePlanStats,
  SkippedEvent,
} from '../common/interfaces';

@Injectable()
export class SpreeService {
  private readonly logger = new Logger(SpreeService.name);

  constructor(
    private readonly eventsService: EventsService,
    private readonly googleRoutesService: GoogleRoutesService,
    private readonly routeOptimizer: RouteOptimizerService,
  ) {}

  /**
   * Compute a spree plan:
   * 1. Resolve all selected events
   * 2. Optimize visit order using chosen strategy
   * 3. Compute real route segments via Google Routes API
   * 4. Track cumulative time, idle waits, flag overflow
   */
  async computeSpreePlan(dto: ComputeSpreeDto): Promise<SpreePlan> {
    const { homeLocation, startTime, endTime, selections, travelMode, strategy } = dto;

    // 1. Resolve events into SchedulableEvent[]
    const schedulable: SchedulableEvent[] = [];

    for (let i = 0; i < selections.length; i++) {
      const sel = selections[i];
      const ev = this.eventsService.findByIdWithVenue(sel.eventId);
      if (!ev) {
        throw new NotFoundException(`Event ${sel.eventId} not found`);
      }
      schedulable.push({
        ...ev,
        stayMinutes: sel.stayMinutes,
        index: i,
      });
    }

    // 2. Optimize visit order
    const spreeStart = new Date(startTime);
    const spreeEnd = new Date(endTime);

    const optimization = strategy === 'time-sort'
      ? this.routeOptimizer.optimizeByStartTime(schedulable)
      : this.routeOptimizer.optimizeGreedy(
          homeLocation,
          schedulable,
          spreeStart,
          spreeEnd,
          travelMode,
        );

    const { orderedEvents, skippedEvents, strategy: usedStrategy } = optimization;

    // 3. Build legs with real route computation
    const legs: SpreeLeg[] = [];
    let currentLocation: LatLng = homeLocation;
    let currentLabel = 'Home';
    let currentTime = spreeStart.getTime();
    let totalTravelSeconds = 0;
    let totalIdleSeconds = 0;
    let totalStayMinutes = 0;

    for (let i = 0; i < orderedEvents.length; i++) {
      const ev = orderedEvents[i];
      const destLocation = ev.venue.location;
      const destLabel = ev.venue.name;

      // Compute travel via Google Routes API (real or mock)
      const routeSegment = await this.googleRoutesService.computeRoute(
        currentLocation,
        destLocation,
        travelMode,
        currentLabel,
        destLabel,
      );

      // Arrival = current time + travel duration
      const travelArrivalMs = currentTime + routeSegment.durationSeconds * 1000;

      // If we arrive before the event starts, we wait
      const eventStartMs = new Date(ev.startTime).getTime();
      const effectiveArrivalMs = Math.max(travelArrivalMs, eventStartMs);
      const idleWaitSeconds = Math.max(0, (effectiveArrivalMs - travelArrivalMs) / 1000);
      const idleWaitMinutes = Math.round(idleWaitSeconds / 60);

      // Departure = effective arrival + stay duration
      const stayMs = ev.stayMinutes * 60 * 1000;
      const departureMs = effectiveArrivalMs + stayMs;

      // Does this leg exceed the spree window?
      const exceedsWindow = departureMs > spreeEnd.getTime();

      legs.push({
        order: i + 1,
        event: {
          id: ev.id,
          name: ev.name,
          presenter: ev.presenter,
          description: ev.description,
          venueId: ev.venueId,
          startTime: ev.startTime,
          endTime: ev.endTime,
          venue: ev.venue,
        },
        travelFromPrevious: routeSegment,
        arrivalTime: new Date(effectiveArrivalMs).toISOString(),
        departureTime: new Date(departureMs).toISOString(),
        stayMinutes: ev.stayMinutes,
        idleWaitMinutes,
        exceedsWindow,
      });

      // Track totals
      totalTravelSeconds += routeSegment.durationSeconds;
      totalIdleSeconds += idleWaitSeconds;
      totalStayMinutes += ev.stayMinutes;

      // Advance state
      currentLocation = destLocation;
      currentLabel = destLabel;
      currentTime = departureMs;
    }

    // 4. Compute final statistics
    const lastDepartureMs = legs.length > 0
      ? new Date(legs[legs.length - 1].departureTime).getTime()
      : spreeStart.getTime();

    const totalDurationMinutes = Math.round((lastDepartureMs - spreeStart.getTime()) / 60000);
    const exceedsEndTime = lastDepartureMs > spreeEnd.getTime();

    const stats: SpreePlanStats = {
      strategy: usedStrategy,
      totalTravelMinutes: Math.round(totalTravelSeconds / 60),
      totalIdleMinutes: Math.round(totalIdleSeconds / 60),
      totalStayMinutes,
      eventsScheduled: orderedEvents.length,
      eventsSkipped: skippedEvents.length,
    };

    const skipped: SkippedEvent[] = skippedEvents.map((ev) => ({
      event: {
        id: ev.id,
        name: ev.name,
        presenter: ev.presenter,
        description: ev.description,
        venueId: ev.venueId,
        startTime: ev.startTime,
        endTime: ev.endTime,
        venue: ev.venue,
      },
      reason: 'Event ends before you could arrive',
    }));

    this.logger.log(
      `Spree computed: ${legs.length} legs, ${totalDurationMinutes}min total, ` +
      `strategy=${usedStrategy}, exceeds=${exceedsEndTime}`,
    );

    return {
      homeLocation,
      startTime,
      endTime,
      legs,
      totalDurationMinutes,
      exceedsEndTime,
      stats,
      skippedEvents: skipped,
    };
  }
}
