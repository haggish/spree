import { Injectable, Logger } from '@nestjs/common';
import { LatLng, EventWithVenue } from '../common/interfaces';
import { GoogleRoutesService } from './google-routes.service';

/**
 * An event enriched with scheduling metadata for optimization.
 */
export interface SchedulableEvent extends EventWithVenue {
  stayMinutes: number;
  index: number;        // original index in the input array
}

/**
 * Precomputed travel time matrix entry.
 */
export interface TravelEstimate {
  durationSeconds: number;
  distanceMeters: number;
}

/**
 * Result of the optimization: ordered event indices + metadata.
 */
export interface OptimizationResult {
  orderedEvents: SchedulableEvent[];
  skippedEvents: SchedulableEvent[];
  strategy: string;
  totalTravelSeconds: number;
  totalIdleSeconds: number;
}

@Injectable()
export class RouteOptimizerService {
  private readonly logger = new Logger(RouteOptimizerService.name);

  constructor(private readonly routesService: GoogleRoutesService) {}

  /**
   * Build a travel time matrix between home + all event venues.
   * Index 0 = home, index 1..N = events[0..N-1].
   *
   * Uses haversine estimates for the matrix to avoid N² API calls,
   * then uses real API calls only for the final ordered route.
   */
  buildTravelMatrix(
    homeLocation: LatLng,
    events: SchedulableEvent[],
    travelMode: string,
  ): TravelEstimate[][] {
    const locations = [homeLocation, ...events.map((e) => e.venue.location)];
    const n = locations.length;
    const matrix: TravelEstimate[][] = Array.from({ length: n }, () =>
      Array.from({ length: n }, () => ({ durationSeconds: 0, distanceMeters: 0 })),
    );

    // Speed estimates (m/s) for haversine-based matrix
    const speeds: Record<string, number> = {
      DRIVE: 8.33,     // ~30 km/h urban
      WALK: 1.39,      // ~5 km/h
      BICYCLE: 4.17,   // ~15 km/h
      TRANSIT: 6.94,   // ~25 km/h
    };
    const speed = speeds[travelMode] || speeds['DRIVE'];

    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i === j) continue;
        const dist = this.haversineDistance(locations[i], locations[j]);
        matrix[i][j] = {
          distanceMeters: Math.round(dist),
          durationSeconds: Math.round(dist / speed),
        };
      }
    }

    return matrix;
  }

  /**
   * Time-constrained greedy nearest-neighbor optimization.
   *
   * Strategy:
   * 1. Start at home at spreeStartTime.
   * 2. At each step, consider all unvisited events.
   * 3. For each candidate, compute:
   *    - Travel time from current position
   *    - Effective arrival (max of travel arrival vs event start)
   *    - Whether we can attend (arrive before event ends)
   *    - Idle wait time if we arrive early
   * 4. Score each candidate by: minimize(travel_time + idle_wait) — prefer
   *    events we can reach quickly with minimal waiting.
   * 5. Among feasible candidates, pick the best-scored one.
   * 6. If no feasible candidate exists within the spree window, try to
   *    schedule remaining events even if they exceed the window (but mark them).
   * 7. Events that can't be reached before they end are skipped entirely.
   */
  optimizeGreedy(
    homeLocation: LatLng,
    events: SchedulableEvent[],
    spreeStartTime: Date,
    spreeEndTime: Date,
    travelMode: string,
  ): OptimizationResult {
    const matrix = this.buildTravelMatrix(homeLocation, events, travelMode);
    const n = events.length;

    const visited = new Set<number>();
    const ordered: SchedulableEvent[] = [];
    const skipped: SchedulableEvent[] = [];

    let currentMatrixIdx = 0; // 0 = home in the matrix
    let currentTime = spreeStartTime.getTime();
    let totalTravelSeconds = 0;
    let totalIdleSeconds = 0;

    // Phase 1: Greedily schedule events that fit within the spree window
    for (let step = 0; step < n; step++) {
      let bestCandidate: number | null = null;
      let bestScore = Infinity;
      let bestArrivalTime = 0;
      let bestTravelSec = 0;
      let bestIdleSec = 0;

      for (let i = 0; i < n; i++) {
        if (visited.has(i)) continue;

        const ev = events[i];
        const matrixIdx = i + 1; // +1 because index 0 is home
        const travelSec = matrix[currentMatrixIdx][matrixIdx].durationSeconds;
        const travelArrival = currentTime + travelSec * 1000;

        const evStart = new Date(ev.startTime).getTime();
        const evEnd = new Date(ev.endTime).getTime();

        // Can we arrive before the event ends?
        if (travelArrival >= evEnd) continue; // Skip — event will be over

        // Effective arrival: wait if we're early
        const effectiveArrival = Math.max(travelArrival, evStart);
        const idleSec = Math.max(0, (effectiveArrival - travelArrival) / 1000);

        // Score: prefer low total wasted time (travel + idle)
        // Add a small penalty for idle to prefer events that start sooner
        const score = travelSec + idleSec * 0.5;

        if (score < bestScore) {
          bestScore = score;
          bestCandidate = i;
          bestArrivalTime = effectiveArrival;
          bestTravelSec = travelSec;
          bestIdleSec = idleSec;
        }
      }

      if (bestCandidate === null) break; // No more reachable events

      visited.add(bestCandidate);
      ordered.push(events[bestCandidate]);

      totalTravelSeconds += bestTravelSec;
      totalIdleSeconds += bestIdleSec;

      // Advance time: arrival + stay
      const stayMs = events[bestCandidate].stayMinutes * 60 * 1000;
      currentTime = bestArrivalTime + stayMs;
      currentMatrixIdx = bestCandidate + 1; // +1 for matrix offset
    }

    // Phase 2: Any unvisited events → try to append them even if beyond end time
    // (the UI will show a warning for exceeding end time)
    const remaining = events
      .map((ev, idx) => ({ ev, idx }))
      .filter(({ idx }) => !visited.has(idx));

    if (remaining.length > 0) {
      // Sort remaining by start time to keep them in a logical order
      remaining.sort(
        (a, b) => new Date(a.ev.startTime).getTime() - new Date(b.ev.startTime).getTime(),
      );

      for (const { ev, idx } of remaining) {
        const matrixIdx = idx + 1;
        const travelSec = matrix[currentMatrixIdx][matrixIdx].durationSeconds;
        const travelArrival = currentTime + travelSec * 1000;
        const evEnd = new Date(ev.endTime).getTime();

        if (travelArrival >= evEnd) {
          // Truly unreachable — event ends before we could get there
          skipped.push(ev);
          continue;
        }

        // Still reachable (just beyond the spree window)
        visited.add(idx);
        ordered.push(ev);

        const evStart = new Date(ev.startTime).getTime();
        const effectiveArrival = Math.max(travelArrival, evStart);
        const idleSec = Math.max(0, (effectiveArrival - travelArrival) / 1000);

        totalTravelSeconds += travelSec;
        totalIdleSeconds += idleSec;

        const stayMs = ev.stayMinutes * 60 * 1000;
        currentTime = effectiveArrival + stayMs;
        currentMatrixIdx = matrixIdx;
      }
    }

    this.logger.log(
      `Optimization: ${ordered.length} scheduled, ${skipped.length} skipped, ` +
      `${Math.round(totalTravelSeconds / 60)}min travel, ${Math.round(totalIdleSeconds / 60)}min idle`,
    );

    return {
      orderedEvents: ordered,
      skippedEvents: skipped,
      strategy: 'greedy-nearest-time',
      totalTravelSeconds,
      totalIdleSeconds,
    };
  }

  /**
   * Simple time-sort fallback (original Phase 1-3 behavior).
   */
  optimizeByStartTime(events: SchedulableEvent[]): OptimizationResult {
    const sorted = [...events].sort(
      (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
    );
    return {
      orderedEvents: sorted,
      skippedEvents: [],
      strategy: 'time-sort',
      totalTravelSeconds: 0,
      totalIdleSeconds: 0,
    };
  }

  private haversineDistance(a: LatLng, b: LatLng): number {
    const R = 6371000;
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const dLat = toRad(b.lat - a.lat);
    const dLng = toRad(b.lng - a.lng);
    const sinLat = Math.sin(dLat / 2);
    const sinLng = Math.sin(dLng / 2);
    const h = sinLat * sinLat + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinLng * sinLng;
    return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  }
}
