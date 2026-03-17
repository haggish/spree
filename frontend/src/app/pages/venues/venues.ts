import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-venues',
  template: `<main><h1 class="text-3xl font-bold">Venues</h1></main>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VenuesComponent {}