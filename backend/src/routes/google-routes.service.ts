import { Injectable, Logger } from '@nestjs/common';
import { LatLng, RouteSegment, TransitDetail } from '../common/interfaces';

const GOOGLE_ROUTES_API_URL = 'https://routes.googleapis.com/directions/v2:computeRoutes';

interface RoutesApiResponse {
  routes?: Array<{
    distanceMeters: number;
    duration: string; // e.g. "1234s"
    polyline: { encodedPolyline: string };
    legs: Array<{
      distanceMeters: number;
      duration: string;
      polyline: { encodedPolyline: string };
      steps?: Array<{
        travelMode?: string;
        transitDetails?: {
          stopDetails?: {
            departureStop?: { name?: string };
            arrivalStop?: { name?: string };
          };
          transitLine?: {
            nameShort?: string;
            name?: string;
            vehicle?: { type?: string };
          };
        };
      }>;
    }>;
  }>;
}

@Injectable()
export class GoogleRoutesService {
  private readonly logger = new Logger(GoogleRoutesService.name);
  private readonly apiKey = process.env['GOOGLE_MAPS_API_KEY'] || '';

  /**
   * Compute a route between two points using Google Routes API.
   */
  async computeRoute(
    origin: LatLng,
    destination: LatLng,
    travelMode: string = 'DRIVE',
    originLabel: string = 'Origin',
    destinationLabel: string = 'Destination',
  ): Promise<RouteSegment> {
    if (!this.apiKey) {
      this.logger.warn('No GOOGLE_MAPS_API_KEY set — returning mock route');
      return this.mockRoute(origin, destination, travelMode, originLabel, destinationLabel);
    }

    try {
      const body = {
        origin: {
          location: {
            latLng: { latitude: origin.lat, longitude: origin.lng },
          },
        },
        destination: {
          location: {
            latLng: { latitude: destination.lat, longitude: destination.lng },
          },
        },
        travelMode,
        routingPreference: travelMode === 'DRIVE' ? 'TRAFFIC_AWARE' : undefined,
        computeAlternativeRoutes: false,
        languageCode: 'en',
      };

      // Request transit step details when using TRANSIT mode
      const fieldMask = travelMode === 'TRANSIT'
        ? 'routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline,routes.legs.steps.travelMode,routes.legs.steps.transitDetails'
        : 'routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline';

      const response = await fetch(GOOGLE_ROUTES_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': this.apiKey,
          'X-Goog-FieldMask': fieldMask,
        },
        body: JSON.stringify(body),
      });

      const data: RoutesApiResponse = await response.json();

      if (!data.routes || data.routes.length === 0) {
        this.logger.warn('No routes returned from Google API, using mock');
        return this.mockRoute(origin, destination, travelMode, originLabel, destinationLabel);
      }

      const route = data.routes[0];
      const durationSeconds = parseInt(route.duration.replace('s', ''), 10);

      // Extract transit details from leg steps
      const transitDetails = this.extractTransitDetails(route.legs);

      return {
        fromLabel: originLabel,
        fromLocation: origin,
        toLabel: destinationLabel,
        toLocation: destination,
        travelMode,
        distanceMeters: route.distanceMeters,
        durationSeconds,
        polyline: route.polyline.encodedPolyline,
        ...(transitDetails.length > 0 && { transitDetails }),
      };
    } catch (error) {
      this.logger.error('Google Routes API error, falling back to mock', error);
      return this.mockRoute(origin, destination, travelMode, originLabel, destinationLabel);
    }
  }

  /**
   * Compute both walk and transit routes in parallel, return the faster one.
   */
  async computeFastestRoute(
    origin: LatLng,
    destination: LatLng,
    originLabel: string = 'Origin',
    destinationLabel: string = 'Destination',
  ): Promise<RouteSegment> {
    const [walkRoute, transitRoute] = await Promise.allSettled([
      this.computeRoute(origin, destination, 'WALK', originLabel, destinationLabel),
      this.computeRoute(origin, destination, 'TRANSIT', originLabel, destinationLabel),
    ]);

    const walk = walkRoute.status === 'fulfilled' ? walkRoute.value : null;
    const transit = transitRoute.status === 'fulfilled' ? transitRoute.value : null;

    if (walk && transit) {
      return walk.durationSeconds <= transit.durationSeconds ? walk : transit;
    }
    return walk || transit!;
  }

  /**
   * Extract transit details (line name, stops, vehicle type) from route legs.
   */
  private extractTransitDetails(
    legs: NonNullable<RoutesApiResponse['routes']>[0]['legs'],
  ): TransitDetail[] {
    const details: TransitDetail[] = [];
    if (!legs) return details;

    for (const leg of legs) {
      if (!leg.steps) continue;
      for (const step of leg.steps) {
        if (step.travelMode !== 'TRANSIT' || !step.transitDetails) continue;
        const td = step.transitDetails;
        details.push({
          transitType: td.transitLine?.vehicle?.type || 'TRANSIT',
          lineName: td.transitLine?.nameShort || td.transitLine?.name || '',
          departureStop: td.stopDetails?.departureStop?.name || '',
          arrivalStop: td.stopDetails?.arrivalStop?.name || '',
        });
      }
    }
    return details;
  }

  /**
   * Mock route using haversine distance estimation.
   * Used when no API key is configured.
   */
  private mockRoute(
    origin: LatLng,
    destination: LatLng,
    travelMode: string,
    originLabel: string,
    destinationLabel: string,
  ): RouteSegment {
    const distanceMeters = this.haversineDistance(origin, destination);

    // Estimate speed based on travel mode (m/s)
    const speeds: Record<string, number> = {
      DRIVE: 8.33,      // ~30 km/h urban
      WALK: 1.39,       // ~5 km/h
      BICYCLE: 4.17,    // ~15 km/h
      TRANSIT: 6.94,    // ~25 km/h
    };
    const speed = speeds[travelMode] || speeds['DRIVE'];
    const durationSeconds = Math.round(distanceMeters / speed);

    return {
      fromLabel: originLabel,
      fromLocation: origin,
      toLabel: destinationLabel,
      toLocation: destination,
      travelMode,
      distanceMeters: Math.round(distanceMeters),
      durationSeconds,
      polyline: '', // No polyline in mock mode
    };
  }

  private haversineDistance(a: LatLng, b: LatLng): number {
    const R = 6371000; // Earth radius in meters
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const dLat = toRad(b.lat - a.lat);
    const dLng = toRad(b.lng - a.lng);
    const sinLat = Math.sin(dLat / 2);
    const sinLng = Math.sin(dLng / 2);
    const h = sinLat * sinLat + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinLng * sinLng;
    return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  }
}
