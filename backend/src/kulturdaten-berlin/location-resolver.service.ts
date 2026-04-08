import { Injectable, Logger } from '@nestjs/common';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

export interface ResolvedLocation {
  googlePlaceId: string;
  name: string;
  formattedAddress: string;
  lat: number;
  lng: number;
}

interface CacheEntry extends ResolvedLocation {
  resolvedAt: string;
}

const CACHE_PATH = join(process.cwd(), 'data', 'kulturdaten-place-ids.json');

@Injectable()
export class LocationResolverService {
  private readonly logger = new Logger(LocationResolverService.name);
  private cache: Record<string, CacheEntry> = {};

  constructor() {
    this.loadCache();
  }

  private loadCache(): void {
    try {
      if (existsSync(CACHE_PATH)) {
        const raw = readFileSync(CACHE_PATH, 'utf-8');
        this.cache = JSON.parse(raw);
        this.logger.log(`Loaded ${Object.keys(this.cache).length} cached Kulturdaten location mappings`);
      }
    } catch {
      this.logger.warn('Failed to load Kulturdaten location cache, starting fresh');
      this.cache = {};
    }
  }

  private saveCache(): void {
    try {
      const dir = join(process.cwd(), 'data');
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
      writeFileSync(CACHE_PATH, JSON.stringify(this.cache, null, 2), 'utf-8');
    } catch {
      this.logger.warn('Failed to save Kulturdaten location cache');
    }
  }

  async resolve(location: {
    id: string;
    name: string;
    streetAddress?: string;
    postalCode?: string;
    lat?: number;
    lng?: number;
  }): Promise<ResolvedLocation | null> {
    if (this.cache[location.id]) {
      return this.cache[location.id];
    }

    const apiKey = process.env['GOOGLE_MAPS_API_KEY'];
    if (!apiKey) {
      this.logger.warn('No GOOGLE_MAPS_API_KEY — using fallback location data');
      return this.fallback(location);
    }

    // If the Kulturdaten location has coordinates, use them with Find Place
    if (location.lat && location.lng) {
      return this.resolveWithCoords(apiKey, location as typeof location & { lat: number; lng: number });
    }

    // Otherwise geocode from street address
    if (location.streetAddress) {
      return this.resolveWithAddress(apiKey, location);
    }

    // No address and no coordinates — search by name
    return this.resolveByName(apiKey, location);
  }

  private async resolveWithCoords(
    apiKey: string,
    location: { id: string; name: string; lat: number; lng: number },
  ): Promise<ResolvedLocation | null> {
    try {
      const input = encodeURIComponent(`${location.name}, Berlin`);
      const locationBias = `circle:500@${location.lat},${location.lng}`;
      const fields = 'place_id,name,formatted_address,geometry';
      const url =
        `https://maps.googleapis.com/maps/api/place/findplacefromtext/json` +
        `?input=${input}&inputtype=textquery&fields=${fields}` +
        `&locationbias=${encodeURIComponent(locationBias)}&key=${apiKey}`;

      return await this.fetchAndCache(url, location);
    } catch (err) {
      this.logger.error(`Failed to resolve location "${location.name}": ${err}`);
      return this.fallback(location);
    }
  }

  private async resolveWithAddress(
    apiKey: string,
    location: { id: string; name: string; streetAddress?: string; postalCode?: string },
  ): Promise<ResolvedLocation | null> {
    try {
      const addressParts = [location.streetAddress, location.postalCode, 'Berlin'].filter(Boolean);
      const input = encodeURIComponent(addressParts.join(', '));
      const fields = 'place_id,name,formatted_address,geometry';
      const url =
        `https://maps.googleapis.com/maps/api/place/findplacefromtext/json` +
        `?input=${input}&inputtype=textquery&fields=${fields}&key=${apiKey}`;

      return await this.fetchAndCache(url, location);
    } catch (err) {
      this.logger.error(`Failed to resolve location "${location.name}": ${err}`);
      return this.fallback(location);
    }
  }

  private async resolveByName(
    apiKey: string,
    location: { id: string; name: string },
  ): Promise<ResolvedLocation | null> {
    try {
      const input = encodeURIComponent(`${location.name}, Berlin`);
      const fields = 'place_id,name,formatted_address,geometry';
      const url =
        `https://maps.googleapis.com/maps/api/place/findplacefromtext/json` +
        `?input=${input}&inputtype=textquery&fields=${fields}&key=${apiKey}`;

      return await this.fetchAndCache(url, location);
    } catch (err) {
      this.logger.error(`Failed to resolve location "${location.name}": ${err}`);
      return this.fallback(location);
    }
  }

  private async fetchAndCache(
    url: string,
    location: { id: string; name: string; lat?: number; lng?: number },
  ): Promise<ResolvedLocation | null> {
    const res = await fetch(url);
    const data = await res.json();

    if (data.candidates && data.candidates.length > 0) {
      const candidate = data.candidates[0];
      const resolved: CacheEntry = {
        googlePlaceId: candidate.place_id,
        name: candidate.name || location.name,
        formattedAddress: candidate.formatted_address || '',
        lat: candidate.geometry?.location?.lat || location.lat || 0,
        lng: candidate.geometry?.location?.lng || location.lng || 0,
        resolvedAt: new Date().toISOString().slice(0, 10),
      };

      this.cache[location.id] = resolved;
      this.saveCache();
      this.logger.log(`Resolved location "${location.name}" → ${resolved.googlePlaceId}`);
      return resolved;
    }

    this.logger.warn(`No Google Places candidates for "${location.name}"`);
    return this.fallback(location);
  }

  private fallback(location: { id: string; name: string; lat?: number; lng?: number }): ResolvedLocation {
    return {
      googlePlaceId: `kd-${location.id}`,
      name: location.name,
      formattedAddress: 'Berlin, Germany',
      lat: location.lat || 0,
      lng: location.lng || 0,
    };
  }
}
