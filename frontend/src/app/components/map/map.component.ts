import {
  Component,
  OnInit,
  OnDestroy,
  ElementRef,
  ViewChild,
  inject,
  effect,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { GoogleMapsLoaderService, SpreeStateService } from '../../services';
import { EventWithVenue } from '../../models';

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

@Component({
  selector: 'app-map',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="map-wrapper">
      <div #mapContainer class="map-container"></div>
      @if (loading) {
        <div class="map-loading">
          <div class="map-skeleton">
            <div class="skeleton-road h"></div>
            <div class="skeleton-road v"></div>
            <div class="skeleton-road d"></div>
            <div class="skeleton-pin p1"></div>
            <div class="skeleton-pin p2"></div>
            <div class="skeleton-pin p3"></div>
          </div>
          <div class="loading-label">
            <div class="loader-ring"></div>
            <span>Loading map…</span>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .map-wrapper {
      position: relative;
      width: 100%;
      height: 100%;
      min-height: 300px;
    }
    .map-container {
      width: 100%;
      height: 100%;
    }
    .map-loading {
      position: absolute;
      inset: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 16px;
      background: var(--surface-dim);
      overflow: hidden;
    }
    .map-skeleton {
      position: absolute;
      inset: 0;
      opacity: 0.15;
    }
    .skeleton-road {
      position: absolute;
      background: var(--text-secondary);
      border-radius: 2px;
      animation: skeletonPulse 2s ease infinite;
    }
    .skeleton-road.h {
      top: 40%;
      left: 0;
      right: 0;
      height: 3px;
    }
    .skeleton-road.v {
      top: 0;
      bottom: 0;
      left: 55%;
      width: 3px;
      animation-delay: 0.5s;
    }
    .skeleton-road.d {
      top: 20%;
      left: 10%;
      width: 60%;
      height: 2px;
      transform: rotate(25deg);
      animation-delay: 1s;
    }
    .skeleton-pin {
      position: absolute;
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background: var(--accent);
      animation: skeletonPulse 2s ease infinite;
    }
    .skeleton-pin.p1 { top: 30%; left: 25%; animation-delay: 0.2s; }
    .skeleton-pin.p2 { top: 55%; left: 60%; animation-delay: 0.6s; }
    .skeleton-pin.p3 { top: 40%; left: 45%; animation-delay: 1s; }
    .loading-label {
      position: relative;
      z-index: 1;
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 20px;
      background: var(--surface);
      border-radius: 100px;
      box-shadow: var(--shadow-md);
      font-size: 13px;
      color: var(--text-secondary);
    }
    .loader-ring {
      width: 18px;
      height: 18px;
      border: 2px solid var(--border);
      border-top-color: var(--accent);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    @keyframes skeletonPulse {
      0%, 100% { opacity: 0.1; }
      50% { opacity: 0.25; }
    }
  `],
})
export class MapComponent implements OnInit, OnDestroy {
  @ViewChild('mapContainer', { static: true })
  mapContainer!: ElementRef<HTMLDivElement>;

  private readonly mapsLoader = inject(GoogleMapsLoaderService);
  readonly state = inject(SpreeStateService);

  loading = true;
  private map: google.maps.Map | null = null;
  private markers: google.maps.marker.AdvancedMarkerElement[] = [];
  private homeMarker: google.maps.marker.AdvancedMarkerElement | null = null;
  private infoWindow: google.maps.InfoWindow | null = null;
  private polylines: google.maps.Polyline[] = [];

  constructor() {
    // React to events or plan changes
    effect(() => {
      const events = this.state.eventsInTimeRange();
      const selectedIds = this.state.selectedEventIds();
      const plan = this.state.spreePlan();
      const config = this.state.config();

      if (this.map) {
        this.updateMarkers(events, selectedIds);
        this.updateHomeMarker(config.homeLocation);
        this.updatePolylines(plan);
      }
    });
  }

  async ngOnInit(): Promise<void> {
    try {
      await this.mapsLoader.load();
      this.initMap();
    } catch (e) {
      console.error('Failed to load Google Maps:', e);
    } finally {
      this.loading = false;
    }
  }

  ngOnDestroy(): void {
    this.clearMarkers();
    this.clearPolylines();
  }

  private initMap(): void {
    const config = this.state.config();

    this.map = new google.maps.Map(this.mapContainer.nativeElement, {
      center: config.homeLocation,
      zoom: 13,
      mapId: 'SPREE_MAP',
      disableDefaultUI: false,
      zoomControl: true,
      streetViewControl: false,
      fullscreenControl: true,
      mapTypeControl: false,
      gestureHandling: 'greedy',
      styles: [
        {
          featureType: 'poi',
          stylers: [{ visibility: 'simplified' }],
        },
      ],
    });

    this.infoWindow = new google.maps.InfoWindow();

    // Shift+click to set home location
    this.map.addListener('click', (e: google.maps.MapMouseEvent) => {
      if (e.domEvent && (e.domEvent as MouseEvent).shiftKey && e.latLng) {
        this.state.setHomeLocation(
          { lat: e.latLng.lat(), lng: e.latLng.lng() },
          'Home',
        );
      }
    });

    // Initial render
    const events = this.state.eventsInTimeRange();
    const selectedIds = this.state.selectedEventIds();
    this.updateMarkers(events, selectedIds);
    this.updateHomeMarker(config.homeLocation);
  }

  private updateHomeMarker(location: { lat: number; lng: number }): void {
    if (!this.map) return;

    if (this.homeMarker) {
      this.homeMarker.position = location;
      return;
    }

    const homeIcon = document.createElement('div');
    homeIcon.innerHTML = `
      <div style="
        width: 36px; height: 36px;
        background: var(--accent, #FF3366);
        border: 3px solid white;
        border-radius: 50%;
        display: flex; align-items: center; justify-content: center;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        font-size: 16px;
      ">🏠</div>
    `;

    this.homeMarker = new google.maps.marker.AdvancedMarkerElement({
      map: this.map,
      position: location,
      content: homeIcon,
      title: 'Home',
      zIndex: 1000,
    });
  }

  private updateMarkers(
    events: Array<EventWithVenue & { inRange: boolean }>,
    selectedIds: Set<string>,
  ): void {
    if (!this.map) return;
    this.clearMarkers();

    // Build a map of eventId → leg order from the plan (if available)
    const plan = this.state.spreePlan();
    const orderMap = new Map<string, number>();
    const exceedsMap = new Map<string, boolean>();
    if (plan) {
      for (const leg of plan.legs) {
        orderMap.set(leg.event.id, leg.order);
        exceedsMap.set(leg.event.id, leg.exceedsWindow);
      }
    }

    // Group events by venue (same googlePlaceId = same marker)
    const venueGroups = new Map<string, Array<EventWithVenue & { inRange: boolean }>>();
    for (const ev of events) {
      const key = ev.venue.googlePlaceId;
      if (!venueGroups.has(key)) venueGroups.set(key, []);
      venueGroups.get(key)!.push(ev);
    }

    for (const [, venueEvents] of venueGroups) {
      const first = venueEvents[0];
      const anySelected = venueEvents.some((e) => selectedIds.has(e.id));
      const allDisabled = venueEvents.every((e) => !e.inRange);

      // Find lowest route order among events at this venue
      let lowestOrder: number | undefined;
      let anyExceeds = false;
      for (const e of venueEvents) {
        const order = orderMap.get(e.id);
        if (order !== undefined) {
          if (lowestOrder === undefined || order < lowestOrder) lowestOrder = order;
          if (exceedsMap.get(e.id)) anyExceeds = true;
        }
      }
      const hasOrder = lowestOrder !== undefined;

      // Determine marker color
      let bgColor = '#6366f1';
      let borderColor = '#4f46e5';
      if (allDisabled) {
        bgColor = '#94a3b8'; borderColor = '#64748b';
      } else if (hasOrder && anyExceeds) {
        bgColor = '#f59e0b'; borderColor = '#d97706';
      } else if (anySelected) {
        bgColor = '#10b981'; borderColor = '#059669';
      }

      // Determine marker label
      const label = hasOrder
        ? String(lowestOrder)
        : anySelected
          ? '✓'
          : escapeHtml(first.venue.name.charAt(0));

      const size = hasOrder ? 36 : 32;
      const count = venueEvents.length;

      const pin = document.createElement('div');
      pin.innerHTML = `
        <div style="
          position: relative;
          width: ${size}px; height: ${size}px;
          background: ${bgColor};
          border: 3px solid ${borderColor};
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          opacity: ${allDisabled ? '0.5' : '1'};
          transition: transform 0.15s ease;
          cursor: ${allDisabled ? 'not-allowed' : 'pointer'};
          font-size: ${hasOrder ? '15px' : '14px'}; color: white; font-weight: 700;
        ">${label}${count > 1 ? `<span style="
          position: absolute; top: -6px; right: -6px;
          width: 18px; height: 18px;
          background: #1e293b; color: white;
          border-radius: 50%; border: 2px solid white;
          font-size: 10px; font-weight: 700;
          display: flex; align-items: center; justify-content: center;
        ">${count}</span>` : ''}</div>
      `;

      const marker = new google.maps.marker.AdvancedMarkerElement({
        map: this.map,
        position: first.venue.location,
        content: pin,
        title: first.venue.name,
        zIndex: anySelected ? 100 : allDisabled ? 1 : 50,
      });

      marker.addListener('click', () => {
        this.showVenueInfo(venueEvents, allDisabled, marker);
      });

      this.markers.push(marker);
    }
  }

  private showVenueInfo(
    events: Array<EventWithVenue & { inRange: boolean }>,
    allDisabled: boolean,
    marker: google.maps.marker.AdvancedMarkerElement,
  ): void {
    if (!this.infoWindow || !this.map) return;

    const venueName = escapeHtml(events[0].venue.name);
    const selectedIds = this.state.selectedEventIds();

    const eventCards = events.map((ev) => {
      const isSelected = selectedIds.has(ev.id);
      const isDisabled = !ev.inRange;
      const startTime = new Date(ev.startTime).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
      const endTime = new Date(ev.endTime).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
      const safeId = escapeHtml(ev.id);

      return `
        <div style="padding: 8px 0; ${events.length > 1 ? 'border-bottom: 1px solid #e2e8f0;' : ''}">
          <h4 style="margin: 0 0 2px; font-size: 14px; font-weight: 700; color: #1e293b;">
            ${escapeHtml(ev.name)}
          </h4>
          <p style="margin: 0 0 2px; font-size: 11px; color: #64748b;">
            ${escapeHtml(ev.presenter)}
          </p>
          <p style="margin: 0 0 4px; font-size: 11px; color: #475569;">
            🕐 ${startTime} – ${endTime}
          </p>
          <p style="margin: 0 0 6px; font-size: 12px; color: #334155; line-height: 1.3;">
            ${escapeHtml(ev.description)}
          </p>
          ${isDisabled
            ? `<div style="padding: 4px 8px; background: #f1f5f9; border-radius: 6px; font-size: 11px; color: #94a3b8; text-align: center;">
                Outside your spree time window
              </div>`
            : `<button
                id="spree-toggle-${safeId}"
                style="
                  width: 100%; padding: 6px 10px; border: none; border-radius: 6px;
                  font-size: 12px; font-weight: 600; cursor: pointer;
                  background: ${isSelected ? '#fee2e2' : '#6366f1'};
                  color: ${isSelected ? '#dc2626' : 'white'};
                "
              >
                ${isSelected ? '✕ Remove' : '＋ Add to Spree'}
              </button>`
          }
        </div>
      `;
    }).join('');

    const content = `
      <div style="font-family: system-ui, sans-serif; max-width: 280px; padding: 4px;">
        <p style="margin: 0 0 4px; font-size: 12px; font-weight: 600; color: #6366f1;">
          📍 ${venueName}${events.length > 1 ? ` · ${events.length} events` : ''}
        </p>
        ${eventCards}
      </div>
    `;

    this.infoWindow.setContent(content);
    this.infoWindow.open(this.map, marker);

    // Attach click handlers for all event buttons
    if (!allDisabled) {
      setTimeout(() => {
        for (const ev of events) {
          if (!ev.inRange) continue;
          const btn = document.getElementById(`spree-toggle-${escapeHtml(ev.id)}`);
          if (btn) {
            btn.addEventListener('click', () => {
              this.state.toggleEventSelection(ev.id);
              this.infoWindow?.close();
            });
          }
        }
      }, 100);
    }
  }

  private updatePolylines(plan: import('../../models').SpreePlan | null): void {
    this.clearPolylines();
    if (!plan || !this.map || plan.legs.length === 0) return;

    // Fit bounds first so the view is ready
    const bounds = new google.maps.LatLngBounds();
    bounds.extend(plan.homeLocation);
    for (const leg of plan.legs) {
      bounds.extend(leg.event.venue.location);
    }
    this.map.fitBounds(bounds, 60);

    // Animate polylines sequentially with a stagger
    plan.legs.forEach((leg, index) => {
      setTimeout(() => {
        if (!this.map) return;

        const segment = leg.travelFromPrevious;

        // Decode polyline if available, else draw straight line
        let path: google.maps.LatLngLiteral[];
        if (segment.polyline) {
          try {
            const decoded = google.maps.geometry.encoding.decodePath(segment.polyline);
            path = decoded.map((p) => ({ lat: p.lat(), lng: p.lng() }));
          } catch {
            path = [segment.fromLocation, segment.toLocation];
          }
        } else {
          path = [segment.fromLocation, segment.toLocation];
        }

        // Color: amber for legs exceeding the window, indigo for normal
        const strokeColor = leg.exceedsWindow ? '#f59e0b' : '#6366f1';
        const strokeOpacity = leg.exceedsWindow ? 0.7 : 0.85;

        // Draw with animated reveal: start empty, progressively add points
        const polyline = new google.maps.Polyline({
          path: [],
          geodesic: true,
          strokeColor,
          strokeOpacity,
          strokeWeight: 4,
          map: this.map,
        });

        this.polylines.push(polyline);

        // Animate: add path points progressively
        const totalPoints = path.length;
        const animDuration = 400; // ms per leg
        const step = Math.max(1, Math.floor(totalPoints / 20)); // max 20 frames

        let currentPoint = 0;
        const animateStep = () => {
          currentPoint = Math.min(currentPoint + step, totalPoints);
          polyline.setPath(path.slice(0, currentPoint));

          if (currentPoint < totalPoints) {
            requestAnimationFrame(animateStep);
          }
        };
        requestAnimationFrame(animateStep);
      }, index * 300); // 300ms stagger between legs
    });
  }

  private clearMarkers(): void {
    this.markers.forEach((m) => (m.map = null));
    this.markers = [];
  }

  private clearPolylines(): void {
    this.polylines.forEach((p) => p.setMap(null));
    this.polylines = [];
  }
}
