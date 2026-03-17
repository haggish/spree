import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatTabNav, MatTabLink, MatTabNavPanel } from '@angular/material/tabs';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, MatTabNav, MatTabLink, MatTabNavPanel],
  templateUrl: './app.html',
  styleUrl: './app.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  protected readonly navLinks = [
    { label: 'Main', path: '/' },
    { label: 'Events', path: '/events' },
    { label: 'Venues', path: '/venues' },
    { label: 'Spree', path: '/spree' },
  ];
}