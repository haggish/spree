import { Injectable, Logger } from '@nestjs/common';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

export interface ResolvedVenue {
  googlePlaceId: string;
  name: string;
  formattedAddress: string;
  lat: number;
  lng: number;
}

interface CacheEntry extends ResolvedVenue {
  resolvedAt: string;
}

const CACHE_PATH = join(process.cwd(), 'data', 'venue-place-ids.json');

@Injectable()
export class VenueResolverService {
  private readonly logger = new Logger(VenueResolverService.name);
  private cache: Record<string, CacheEntry> = {};

  constructor() {
    this.loadCache();
  }

  private loadCache(): void {
    try {
      if (existsSync(CACHE_PATH)) {
        const raw = readFileSync(CACHE_PATH, 'utf-8');
        this.cache = JSON.parse(raw);
        this.logger.log(`Loaded ${Object.keys(this.cache).length} cached venue mappings`);
      }
    } catch (err) {
      this.logger.warn('Failed to load venue cache, starting fresh');
      this.cache = {};
    }
  }

  private saveCache(): void {
    try {
      const dir = join(process.cwd(), 'data');
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
      writeFileSync(CACHE_PATH, JSON.stringify(this.cache, null, 2), 'utf-8');
    } catch (err) {
      this.logger.warn('Failed to save venue cache');
    }
  }

  async resolve(venue: {
    id: string;
    name: string;
    lat: number;
    lng: number;
  }): Promise<ResolvedVenue | null> {
    // Check cache
    if (this.cache[venue.id]) {
      return this.cache[venue.id];
    }

    // Call Google Find Place from Text
    const apiKey = process.env['GOOGLE_MAPS_API_KEY'];
    if (!apiKey) {
      this.logger.warn('No GOOGLE_MAPS_API_KEY — using fallback venue data');
      return this.fallback(venue);
    }

    try {
      const input = encodeURIComponent(`${venue.name}, Berlin`);
      const locationBias = `circle:500@${venue.lat},${venue.lng}`;
      const fields = 'place_id,name,formatted_address,geometry';
      const url =
        `https://maps.googleapis.com/maps/api/place/findplacefromtext/json` +
        `?input=${input}&inputtype=textquery&fields=${fields}` +
        `&locationbias=${encodeURIComponent(locationBias)}&key=${apiKey}`;

      const res = await fetch(url);
      const data = await res.json();

      if (data.candidates && data.candidates.length > 0) {
        const candidate = data.candidates[0];
        const resolved: CacheEntry = {
          googlePlaceId: candidate.place_id,
          name: candidate.name || venue.name,
          formattedAddress: candidate.formatted_address || '',
          lat: candidate.geometry?.location?.lat || venue.lat,
          lng: candidate.geometry?.location?.lng || venue.lng,
          resolvedAt: new Date().toISOString().slice(0, 10),
        };

        this.cache[venue.id] = resolved;
        this.saveCache();
        this.logger.log(`Resolved venue "${venue.name}" → ${resolved.googlePlaceId}`);
        return resolved;
      }

      this.logger.warn(`No Google Places candidates for "${venue.name}"`);
      return this.fallback(venue);
    } catch (err) {
      this.logger.error(`Failed to resolve venue "${venue.name}": ${err}`);
      return this.fallback(venue);
    }
  }

  /**
   * Fallback when no API key or API fails — use Index Berlin data directly.
   * Generates a deterministic pseudo Place ID so the venue is still usable.
   */
  private fallback(venue: { id: string; name: string; lat: number; lng: number }): ResolvedVenue {
    return {
      googlePlaceId: `ib-${venue.id}`,
      name: venue.name,
      formattedAddress: 'Berlin, Germany',
      lat: venue.lat,
      lng: venue.lng,
    };
  }
}
