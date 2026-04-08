import { Injectable } from '@angular/core';
import { setOptions, importLibrary } from '@googlemaps/js-api-loader';
import { environment } from '@env/environment';

@Injectable({ providedIn: 'root' })
export class GoogleMapsLoaderService {
  private loadPromise: Promise<void> | null = null;

  load(): Promise<void> {
    if (this.loadPromise) {
      return this.loadPromise;
    }

    setOptions({
      key: environment.googleMapsApiKey,
      v: 'weekly',
    });

    this.loadPromise = Promise.all([
      importLibrary('places'),
      importLibrary('marker'),
      importLibrary('geometry'),
    ]).then(() => {});

    return this.loadPromise;
  }
}
