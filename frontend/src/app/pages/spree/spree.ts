import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-spree',
  template: `<main><h1 class="text-3xl font-bold">Spree</h1></main>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SpreeComponent {}