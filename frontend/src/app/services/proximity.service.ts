import { Injectable, inject, signal, effect } from '@angular/core';
import { GeolocationService } from './geolocation.service';
import { LiveSpreeStateService } from './live-spree-state.service';
import { haversineDistance } from './geo-utils';

const CHECK_IN_RADIUS = 100;  // meters
const AUTO_CHECKOUT_RADIUS = 200; // meters

@Injectable({ providedIn: 'root' })
export class ProximityService {
  private readonly geo = inject(GeolocationService);
  private readonly liveState = inject(LiveSpreeStateService);

  readonly nearNextVenue = signal(false);
  readonly nearVenueName = signal('');
  readonly movedAwayFromCheckedIn = signal(false);

  constructor() {
    effect(() => {
      const pos = this.geo.currentPosition();
      if (!pos) {
        this.nearNextVenue.set(false);
        this.movedAwayFromCheckedIn.set(false);
        return;
      }

      // Check proximity to next venue
      const nextLeg = this.liveState.nextLeg();
      if (nextLeg) {
        const dist = haversineDistance(pos, nextLeg.event.venue.location);
        this.nearNextVenue.set(dist <= CHECK_IN_RADIUS);
        this.nearVenueName.set(nextLeg.event.venue.name);
      } else {
        this.nearNextVenue.set(false);
        this.nearVenueName.set('');
      }

      // Check if moved away from checked-in venue
      const checkedInId = this.liveState.checkedInEventId();
      if (checkedInId) {
        const checkedInLeg = this.liveState.allLegs().find(
          (l) => l.event.id === checkedInId,
        );
        if (checkedInLeg) {
          const dist = haversineDistance(pos, checkedInLeg.event.venue.location);
          this.movedAwayFromCheckedIn.set(dist > AUTO_CHECKOUT_RADIUS);
        }
      } else {
        this.movedAwayFromCheckedIn.set(false);
      }
    });

    // Auto-checkout when moved away
    effect(() => {
      if (this.movedAwayFromCheckedIn()) {
        this.liveState.checkOut();
      }
    });
  }

  /** Check if a specific venue is within check-in radius */
  isNearVenue(venueLat: number, venueLng: number): boolean {
    const pos = this.geo.currentPosition();
    if (!pos) return false;
    return haversineDistance(pos, { lat: venueLat, lng: venueLng }) <= CHECK_IN_RADIUS;
  }
}
