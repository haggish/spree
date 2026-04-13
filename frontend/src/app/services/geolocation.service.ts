import { Injectable, OnDestroy, signal } from '@angular/core';
import { LatLng } from '../models';

@Injectable({ providedIn: 'root' })
export class GeolocationService implements OnDestroy {
  readonly currentPosition = signal<LatLng | null>(null);
  readonly error = signal<string | null>(null);
  readonly watching = signal(false);

  private watchId: number | null = null;

  startWatching(): void {
    if (this.watchId !== null) return;

    if (!navigator.geolocation) {
      this.error.set('Geolocation is not supported by this browser');
      return;
    }

    this.watching.set(true);
    this.error.set(null);

    this.watchId = navigator.geolocation.watchPosition(
      (position) => {
        this.currentPosition.set({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        this.error.set(null);
      },
      (err) => {
        this.error.set(err.message);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 5000,
      },
    );
  }

  stopWatching(): void {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
    this.watching.set(false);
  }

  ngOnDestroy(): void {
    this.stopWatching();
  }
}
