import { ChangeDetectionStrategy, Component, computed } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { Event, todayForUrl } from '../../shared/events';

@Component({
  selector: 'app-main',
  imports: [],
  template: `
    <main>
      <h1 class="text-3xl font-bold">EVENTS TODAY {{ dateForTitle() }}</h1>
      <div class="grid gap-y-1" role="list">
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
export class MainComponent {
  protected readonly dateForUrl = computed(() => todayForUrl());

  protected readonly dateForTitle = computed(() => this.dateForUrl().replaceAll('-', '.'));

  protected readonly events = httpResource<Event[]>(
    () => `http://localhost:8080/events/at/${this.dateForUrl()}`,
  );
}
