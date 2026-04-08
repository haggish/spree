import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from './test-app';

describe('Event Groups API (integration)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /api/event-groups', () => {
    it('should return a list of event group summaries', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/event-groups')
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(2);

      // Each summary should have the right shape
      for (const group of res.body) {
        expect(group).toHaveProperty('id');
        expect(group).toHaveProperty('name');
        expect(group).toHaveProperty('eventCount');
        expect(group).toHaveProperty('earliestStart');
        expect(group).toHaveProperty('latestEnd');
      }

      // Should include the two static groups
      const ids = res.body.map((g: any) => g.id);
      expect(ids).toContain('berlin-music-day');
      expect(ids).toContain('berlin-arts-culture');
    });
  });

  describe('GET /api/event-groups/:id', () => {
    it('should return a full event group with events', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/event-groups/berlin-music-day')
        .expect(200);

      expect(res.body.id).toBe('berlin-music-day');
      expect(res.body.name).toBe('Berlin Music Day');
      expect(Array.isArray(res.body.events)).toBe(true);
      expect(res.body.events.length).toBeGreaterThan(0);

      // Each event should have a resolved venue
      const event = res.body.events[0];
      expect(event).toHaveProperty('id');
      expect(event).toHaveProperty('name');
      expect(event).toHaveProperty('startTime');
      expect(event).toHaveProperty('endTime');
      expect(event).toHaveProperty('venue');
      expect(event.venue).toHaveProperty('name');
      expect(event.venue).toHaveProperty('location');
      expect(event.venue).toHaveProperty('googlePlaceId');
    });

    it('should return 404 for unknown group', async () => {
      await request(app.getHttpServer())
        .get('/api/event-groups/nonexistent')
        .expect(404);
    });
  });

  describe('GET /api/event-groups/:id/at/:date', () => {
    it('should return events filtered to a specific date', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/event-groups/berlin-music-day/at/2026-04-05')
        .expect(200);

      expect(res.body.id).toBe('berlin-music-day');
      expect(Array.isArray(res.body.events)).toBe(true);

      // All events should be on April 5
      for (const event of res.body.events) {
        expect(event.startTime).toContain('2026-04-05');
      }
    });

    it('should return empty events for a date with none', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/event-groups/berlin-music-day/at/2026-01-01')
        .expect(200);

      expect(res.body.events).toHaveLength(0);
    });

    it('should return 404 for unknown group', async () => {
      await request(app.getHttpServer())
        .get('/api/event-groups/nonexistent/at/2026-04-05')
        .expect(404);
    });
  });
});
