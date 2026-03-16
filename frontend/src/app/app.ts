import { ChangeDetectionStrategy, Component, computed } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { httpResource } from '@angular/common/http';

interface TimeRange {
  start: string;
  end: string;
}

interface Venue {
  id: number;
  name: string;
  location: { x: number; y: number };
}

interface Event {
  id: number;
  name: string;
  author: string;
  during: TimeRange;
  venue: Venue;
}

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  private readonly today = new Date();

  protected readonly dateForUrl = computed(() => '21-03-2026'); /** {
    const d = this.today;
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}-${mm}-${yyyy}`;
  }); */

  protected readonly dateForTitle = computed(() => this.dateForUrl().replaceAll('-', '.'));

  protected readonly events = httpResource<Event[]>(
    () => `http://localhost:8080/events/at/${this.dateForUrl()}`,
  );
}
