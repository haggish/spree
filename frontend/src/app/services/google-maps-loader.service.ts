import { Injectable } from '@angular/core';
import { Loader } from '@googlemaps/js-api-loader';
import { environment } from '@env/environment';

@Injectable({ providedIn: 'root' })
export class GoogleMapsLoaderService {
  private loader: Loader | null = null;
  private loadPromise: Promise<typeof google> | null = null;

  load(): Promise<typeof google> {
    if (this.loadPromise) {
      return this.loadPromise;
    }

    this.loader = new Loader({
      apiKey: environment.googleMapsApiKey,
      version: 'weekly',
      libraries: ['places', 'marker', 'geometry'],
    });

    this.loadPromise = this.loader.load();
    return this.loadPromise;
  }
}
