import {
  Component, OnInit, OnDestroy, ElementRef, ViewChild, inject, effect,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  GoogleMapsLoaderService, LiveSpreeStateService, GeolocationService, ProximityService,
} from '../../../services';
import { haversineDistance } from '../../../services/geo-utils';
import { LiveLegStatus, EventWithVenue, SpreeLeg } from '../../../models';

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

const STATUS_COLORS: Record<LiveLegStatus, { bg: string; border: string }> = {
  upcoming: { bg: '#6366f1', border: '#4f46e5' },
  next: { bg: '#4f46e5', border: '#3730a3' },
  'checked-in': { bg: '#10b981', border: '#059669' },
  visited: { bg: '#94a3b8', border: '#64748b' },
  excluded: { bg: '#cbd5e1', border: '#94a3b8' },
};

@Component({
  selector: 'app-live-map',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="map-wrapper">
      <div #mapContainer class="map-container"></div>
      @if (loading) {
        <div class="map-loading">
          <div class="loader-ring"></div>
          <span>Loading map...</span>
        </div>
      }
    </div>
  `,
  styles: [`
    .map-wrapper { position: relative; width: 100%; height: 100%; }
    .map-container { width: 100%; height: 100%; }
    .map-loading {
      position: absolute; inset: 0;
      display: flex; align-items: center; justify-content: center; gap: 10px;
      background: var(--surface-dim); font-size: 13px; color: var(--text-secondary);
    }
    .loader-ring {
      width: 18px; height: 18px;
      border: 2px solid var(--border); border-top-color: var(--accent);
      border-radius: 50%; animation: spin 0.8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
  `],
})
export class LiveMapComponent implements OnInit, OnDestroy {
  @ViewChild('mapContainer', { static: true })
  mapContainer!: ElementRef<HTMLDivElement>;

  private readonly mapsLoader = inject(GoogleMapsLoaderService);
  readonly liveState = inject(LiveSpreeStateService);
  private readonly geo = inject(GeolocationService);
  private readonly proximity = inject(ProximityService);

  loading = true;
  private map: google.maps.Map | null = null;
  private markers: google.maps.marker.AdvancedMarkerElement[] = [];
  private userMarker: google.maps.marker.AdvancedMarkerElement | null = null;
  private infoWindow: google.maps.InfoWindow | null = null;
  private polylines: google.maps.Polyline[] = [];

  constructor() {
    // React to plan/state changes
    effect(() => {
      const plan = this.liveState.currentPlan();
      const states = this.liveState.eventStates();
      if (this.map && plan) {
        this.updateMarkers(plan.legs, states);
        this.updatePolylines(plan.legs, states);
      }
    });

    // React to user location changes
    effect(() => {
      const pos = this.geo.currentPosition();
      if (this.map && pos) {
        this.updateUserMarker(pos);
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
    this.markers.forEach((m) => (m.map = null));
    this.polylines.forEach((p) => p.setMap(null));
    if (this.userMarker) this.userMarker.map = null;
  }

  private initMap(): void {
    const plan = this.liveState.currentPlan();
    const center = plan?.homeLocation ?? { lat: 52.52, lng: 13.405 };

    this.map = new google.maps.Map(this.mapContainer.nativeElement, {
      center,
      zoom: 13,
      mapId: 'SPREE_LIVE_MAP',
      disableDefaultUI: false,
      zoomControl: true,
      streetViewControl: false,
      fullscreenControl: false,
      mapTypeControl: false,
      gestureHandling: 'greedy',
    });

    this.infoWindow = new google.maps.InfoWindow();

    if (plan) {
      const states = this.liveState.eventStates();
      this.updateMarkers(plan.legs, states);
      this.updatePolylines(plan.legs, states);
      this.fitBounds(plan.legs);
    }
  }

  private updateUserMarker(pos: { lat: number; lng: number }): void {
    if (!this.map) return;

    if (this.userMarker) {
      this.userMarker.position = pos;
      return;
    }

    const dot = document.createElement('div');
    dot.innerHTML = `
      <div style="position: relative;">
        <div style="
          width: 16px; height: 16px;
          background: #3b82f6;
          border: 3px solid white;
          border-radius: 50%;
          box-shadow: 0 2px 8px rgba(59,130,246,0.5);
        "></div>
        <div style="
          position: absolute; inset: -8px;
          border: 2px solid rgba(59,130,246,0.3);
          border-radius: 50%;
          animation: livePulse 2s ease infinite;
        "></div>
      </div>
      <style>
        @keyframes livePulse {
          0% { transform: scale(1); opacity: 0.6; }
          100% { transform: scale(2.5); opacity: 0; }
        }
      </style>
    `;

    this.userMarker = new google.maps.marker.AdvancedMarkerElement({
      map: this.map,
      position: pos,
      content: dot,
      title: 'You',
      zIndex: 2000,
    });
  }

  private updateMarkers(legs: SpreeLeg[], states: Map<string, LiveLegStatus>): void {
    if (!this.map) return;
    this.markers.forEach((m) => (m.map = null));
    this.markers = [];

    for (const leg of legs) {
      const status = states.get(leg.event.id) ?? 'upcoming';
      const colors = STATUS_COLORS[status];
      const isNext = status === 'next';
      const isVisited = status === 'visited';
      const isExcluded = status === 'excluded';
      const isCheckedIn = status === 'checked-in';

      const size = isNext ? 40 : 32;
      const label = isVisited ? '✓' : isExcluded ? '—' : String(leg.order);

      const pin = document.createElement('div');
      pin.innerHTML = `
        <div style="
          position: relative;
          width: ${size}px; height: ${size}px;
          background: ${colors.bg};
          border: 3px solid ${colors.border};
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          opacity: ${isExcluded ? '0.4' : '1'};
          font-size: ${isNext ? '16px' : '13px'}; color: white; font-weight: 700;
          ${isNext ? 'animation: nextGlow 1.5s ease infinite;' : ''}
          ${isCheckedIn ? 'animation: checkedPulse 1s ease infinite;' : ''}
        ">${label}</div>
        ${isNext ? `<style>
          @keyframes nextGlow {
            0%, 100% { box-shadow: 0 0 0 0 rgba(79,70,229,0.4); }
            50% { box-shadow: 0 0 0 12px rgba(79,70,229,0); }
          }
        </style>` : ''}
        ${isCheckedIn ? `<style>
          @keyframes checkedPulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.1); }
          }
        </style>` : ''}
      `;

      const marker = new google.maps.marker.AdvancedMarkerElement({
        map: this.map,
        position: leg.event.venue.location,
        content: pin,
        title: leg.event.venue.name,
        zIndex: isNext ? 500 : isVisited || isExcluded ? 10 : 100,
      });

      marker.addListener('click', () => {
        this.showVenueInfo(leg, status, marker);
      });

      this.markers.push(marker);
    }
  }

  private showVenueInfo(
    leg: SpreeLeg,
    status: LiveLegStatus,
    marker: google.maps.marker.AdvancedMarkerElement,
  ): void {
    if (!this.infoWindow || !this.map) return;

    const ev = leg.event;
    const safeId = escapeHtml(ev.id);
    const isNear = this.proximity.isNearVenue(ev.venue.location.lat, ev.venue.location.lng);
    const checkedIn = status === 'checked-in';
    const isVisited = status === 'visited';
    const isExcluded = status === 'excluded';

    // Build all events at this venue (primary + colocated)
    const allEvents = [ev, ...(leg.colocatedEvents ?? [])];
    const eventCards = allEvents.map((e) => `
      <div style="padding: 4px 0;">
        <strong style="font-size: 13px; color: #1e293b;">${escapeHtml(e.name)}</strong>
        <div style="font-size: 11px; color: #64748b;">${escapeHtml(e.presenter)}</div>
      </div>
    `).join('');

    const startTime = new Date(ev.startTime).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
    const endTime = new Date(ev.endTime).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });

    let buttons = '';
    if (checkedIn) {
      buttons = `<button id="live-checkout-${safeId}" style="
        width: 100%; padding: 8px; border: none; border-radius: 8px;
        background: #f59e0b; color: white; font-weight: 600; font-size: 13px; cursor: pointer;
      ">Check Out</button>`;
    } else if (isVisited) {
      buttons = `<div style="padding: 6px; text-align: center; color: #10b981; font-weight: 600; font-size: 12px;">Visited ✓</div>`;
    } else if (isExcluded) {
      buttons = `<button id="live-include-${safeId}" style="
        width: 100%; padding: 8px; border: none; border-radius: 8px;
        background: #6366f1; color: white; font-weight: 600; font-size: 13px; cursor: pointer;
      ">Include Back</button>`;
    } else {
      buttons = `
        <div style="display: flex; gap: 6px;">
          <button id="live-checkin-${safeId}" ${!isNear ? 'disabled' : ''} style="
            flex: 1; padding: 8px; border: none; border-radius: 8px;
            background: ${isNear ? '#10b981' : '#e2e8f0'}; color: ${isNear ? 'white' : '#94a3b8'};
            font-weight: 600; font-size: 12px; cursor: ${isNear ? 'pointer' : 'not-allowed'};
          ">Check In</button>
          <button id="live-next-${safeId}" style="
            flex: 1; padding: 8px; border: none; border-radius: 8px;
            background: #eef2ff; color: #4f46e5; font-weight: 600; font-size: 12px; cursor: pointer;
          ">Go Here Next</button>
        </div>
        <button id="live-exclude-${safeId}" style="
          width: 100%; padding: 6px; border: 1px solid #e2e8f0; border-radius: 8px;
          background: white; color: #64748b; font-weight: 500; font-size: 12px; cursor: pointer; margin-top: 4px;
        ">Exclude</button>
      `;
    }

    const content = `
      <div style="font-family: system-ui, sans-serif; max-width: 280px; padding: 4px;">
        <p style="margin: 0 0 4px; font-size: 11px; font-weight: 600; color: #6366f1;">
          📍 ${escapeHtml(ev.venue.name)}
        </p>
        <p style="margin: 0 0 6px; font-size: 11px; color: #475569;">🕐 ${startTime} – ${endTime}</p>
        ${eventCards}
        <div style="margin-top: 8px;">${buttons}</div>
        ${!isNear && !checkedIn && !isVisited && !isExcluded ? '<p style="font-size: 10px; color: #94a3b8; margin: 4px 0 0; text-align: center;">Check in available within 100m</p>' : ''}
      </div>
    `;

    this.infoWindow.setContent(content);
    this.infoWindow.open(this.map, marker);

    setTimeout(() => {
      const bind = (suffix: string, action: () => void) => {
        const btn = document.getElementById(`live-${suffix}-${safeId}`);
        if (btn && !btn.hasAttribute('disabled')) {
          btn.addEventListener('click', () => { action(); this.infoWindow?.close(); });
        }
      };
      bind('checkin', () => this.liveState.checkIn(ev.id));
      bind('checkout', () => this.liveState.checkOut());
      bind('exclude', () => this.liveState.exclude(ev.id));
      bind('include', () => this.liveState.include(ev.id));
      bind('next', () => this.liveState.forceNext(ev.id));
    }, 100);
  }

  private updatePolylines(legs: SpreeLeg[], states: Map<string, LiveLegStatus>): void {
    this.polylines.forEach((p) => p.setMap(null));
    this.polylines = [];
    if (!this.map) return;

    for (const leg of legs) {
      const status = states.get(leg.event.id) ?? 'upcoming';
      if (status === 'visited' || status === 'excluded') continue;

      const segment = leg.travelFromPrevious;
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

      const isNext = status === 'next';
      const polyline = new google.maps.Polyline({
        path,
        geodesic: true,
        strokeColor: isNext ? '#4f46e5' : '#6366f1',
        strokeOpacity: isNext ? 1 : 0.5,
        strokeWeight: isNext ? 5 : 3,
        map: this.map,
      });
      this.polylines.push(polyline);
    }
  }

  private fitBounds(legs: SpreeLeg[]): void {
    if (!this.map || legs.length === 0) return;
    const bounds = new google.maps.LatLngBounds();
    const pos = this.geo.currentPosition();
    if (pos) bounds.extend(pos);
    for (const leg of legs) bounds.extend(leg.event.venue.location);
    this.map.fitBounds(bounds, 60);
  }
}
