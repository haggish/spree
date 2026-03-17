import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { GoogleMap, MapMarker } from '@angular/google-maps';
import { Event, todayForUrl } from '../../shared/events';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-events',
  imports: [GoogleMap, MapMarker],
  template: `
    <main>
      <h1 class="text-3xl font-bold">Events {{ dateForTitle() }}</h1>

      <google-map width="100%" height="400px" [center]="mapCenter" [zoom]="12">
        @for (marker of markers(); track marker.id) {
          <map-marker [position]="marker.position" [title]="marker.title" />
        }
      </google-map>

      <div class="grid gap-y-1 mt-4" role="list">
        @for (event of events.value() ?? []; track event.id) {
          <div class="grid grid-cols-3 gap-x-8 py-2" role="listitem">
            <span class="font-bold">{{ event.name }}</span>
            <span>{{ event.author }}</span>
            <span>{{ event.venue.name }}</span>
          </div>
        }
      </div>
    </main>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EventsComponent {
  private readonly params = toSignal(inject(ActivatedRoute).paramMap);

  protected readonly dateForUrl = computed(() => this.params()?.get('date') ?? todayForUrl());

  protected readonly dateForTitle = computed(() => this.dateForUrl().replaceAll('-', '.'));

  protected readonly events = httpResource<Event[]>(
    () => `${environment.apiUrl}/events/at/${this.dateForUrl()}`,
  );

  protected readonly markers = computed(() =>
    (this.events.value() ?? []).map(event => ({
      position: { lat: event.venue.location.x, lng: event.venue.location.y },
      title: event.venue.name,
      id: event.id,
    }))
  );

  protected readonly mapCenter: google.maps.LatLngLiteral = { lat: 52.52, lng: 13.405 };
}
