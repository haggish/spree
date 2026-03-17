import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-events',
  template: `<main><h1 class="text-3xl font-bold">Events</h1></main>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EventsComponent {}