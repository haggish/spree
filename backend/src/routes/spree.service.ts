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
   * 2. Merge co-located events (same venue, overlapping times) into single stops
   * 3. Optimize visit order using chosen strategy
   * 4. Compute real route segments via Google Routes API
   * 5. Track cumulative time, idle waits, flag overflow
   */
  async computeSpreePlan(dto: ComputeSpreeDto): Promise<SpreePlan> {
    const { homeLocation, startTime, endTime, selections, strategy } = dto;

    // 1. Resolve events into SchedulableEvent[]
    const allResolved: SchedulableEvent[] = [];

    for (let i = 0; i < selections.length; i++) {
      const sel = selections[i];
      const ev = await this.eventsService.findByIdWithVenue(sel.eventId);
      if (!ev) {
        throw new NotFoundException(`Event ${sel.eventId} not found`);
      }
      allResolved.push({
        ...ev,
        stayMinutes: sel.stayMinutes,
        index: i,
      });
    }

    // 2. Merge co-located events (same venue, overlapping times) into single stops
    const { merged, expandMap } = this.mergeColocatedEvents(allResolved);

    // 3. Optimize visit order
    const spreeStart = new Date(startTime);
    const spreeEnd = new Date(endTime);

    const optimization = strategy === 'time-sort'
      ? this.routeOptimizer.optimizeByStartTime(merged)
      : this.routeOptimizer.optimizeGreedy(
          homeLocation,
          merged,
          spreeStart,
          spreeEnd,
        );

    const { orderedEvents, skippedEvents, strategy: usedStrategy } = optimization;

    // 4. Build legs with real route computation
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

      // Compute travel via Google Routes API — pick faster of walk vs transit
      const routeSegment = await this.googleRoutesService.computeFastestRoute(
        currentLocation,
        destLocation,
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

      // Expand co-located events back into the leg
      const colocated = expandMap.get(ev.id);

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
        ...(colocated && colocated.length > 0 && { colocatedEvents: colocated }),
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

  /**
   * Group events at the same venue with overlapping times into single stops.
   * Returns merged events (one per venue group) and a map to expand them back.
   */
  private mergeColocatedEvents(events: SchedulableEvent[]): {
    merged: SchedulableEvent[];
    expandMap: Map<string, import('../common/interfaces').EventWithVenue[]>;
  } {
    // Group by venue googlePlaceId
    const venueGroups = new Map<string, SchedulableEvent[]>();
    for (const ev of events) {
      const key = ev.venue.googlePlaceId;
      if (!venueGroups.has(key)) venueGroups.set(key, []);
      venueGroups.get(key)!.push(ev);
    }

    const merged: SchedulableEvent[] = [];
    const expandMap = new Map<string, import('../common/interfaces').EventWithVenue[]>();

    for (const [, group] of venueGroups) {
      if (group.length === 1) {
        merged.push(group[0]);
        continue;
      }

      // Sort by start time
      group.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

      // Merge overlapping events into clusters
      const clusters: SchedulableEvent[][] = [];
      let current = [group[0]];

      for (let i = 1; i < group.length; i++) {
        const lastEnd = Math.max(...current.map((e) => new Date(e.endTime).getTime()));
        const nextStart = new Date(group[i].startTime).getTime();

        if (nextStart <= lastEnd) {
          // Overlapping — add to current cluster
          current.push(group[i]);
        } else {
          clusters.push(current);
          current = [group[i]];
        }
      }
      clusters.push(current);

      for (const cluster of clusters) {
        if (cluster.length === 1) {
          merged.push(cluster[0]);
          continue;
        }

        // Merge: use earliest start, latest end, sum stay times
        const primary = cluster[0];
        const earliestStart = cluster.reduce((min, e) =>
          e.startTime < min ? e.startTime : min, cluster[0].startTime);
        const latestEnd = cluster.reduce((max, e) =>
          e.endTime > max ? e.endTime : max, cluster[0].endTime);
        const totalStay = cluster.reduce((sum, e) => sum + e.stayMinutes, 0);

        const mergedEvent: SchedulableEvent = {
          ...primary,
          startTime: earliestStart,
          endTime: latestEnd,
          stayMinutes: totalStay,
        };

        merged.push(mergedEvent);

        // Track the extra events for expansion
        const extras = cluster.slice(1).map((e) => ({
          id: e.id,
          name: e.name,
          presenter: e.presenter,
          description: e.description,
          venueId: e.venueId,
          startTime: e.startTime,
          endTime: e.endTime,
          venue: e.venue,
        }));
        expandMap.set(primary.id, extras);
      }
    }

    if (merged.length < events.length) {
      this.logger.log(
        `Merged ${events.length} events into ${merged.length} stops (${events.length - merged.length} co-located)`,
      );
    }

    return { merged, expandMap };
  }
}
