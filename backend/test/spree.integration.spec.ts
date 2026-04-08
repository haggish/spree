import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from './test-app';

describe('Spree Compute API (integration)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/spree/compute', () => {
    it('should compute a spree plan with greedy strategy', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/spree/compute')
        .send({
          homeLocation: { lat: 52.520, lng: 13.405 },
          startTime: '2026-04-05T10:00:00+02:00',
          endTime: '2026-04-05T23:00:00+02:00',
          selections: [
            { eventId: 'evt-001', stayMinutes: 15 },
            { eventId: 'evt-002', stayMinutes: 10 },
          ],
          strategy: 'greedy',
        })
        .expect(201);

      // Response shape
      expect(res.body).toHaveProperty('homeLocation');
      expect(res.body).toHaveProperty('startTime');
      expect(res.body).toHaveProperty('endTime');
      expect(res.body).toHaveProperty('legs');
      expect(res.body).toHaveProperty('totalDurationMinutes');
      expect(res.body).toHaveProperty('exceedsEndTime');
      expect(res.body).toHaveProperty('stats');
      expect(res.body).toHaveProperty('skippedEvents');

      // Legs
      expect(Array.isArray(res.body.legs)).toBe(true);
      expect(res.body.legs.length).toBe(2);

      const leg = res.body.legs[0];
      expect(leg).toHaveProperty('order');
      expect(leg).toHaveProperty('event');
      expect(leg).toHaveProperty('travelFromPrevious');
      expect(leg).toHaveProperty('arrivalTime');
      expect(leg).toHaveProperty('departureTime');
      expect(leg).toHaveProperty('stayMinutes');
      expect(leg).toHaveProperty('idleWaitMinutes');

      // Travel segment
      expect(leg.travelFromPrevious).toHaveProperty('travelMode');
      expect(leg.travelFromPrevious).toHaveProperty('distanceMeters');
      expect(leg.travelFromPrevious).toHaveProperty('durationSeconds');

      // Stats
      expect(res.body.stats.strategy).toBe('greedy-nearest-time');
      expect(res.body.stats.eventsScheduled).toBe(2);
    });

    it('should compute with time-sort strategy', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/spree/compute')
        .send({
          homeLocation: { lat: 52.520, lng: 13.405 },
          startTime: '2026-04-05T10:00:00+02:00',
          endTime: '2026-04-05T23:00:00+02:00',
          selections: [
            { eventId: 'evt-002', stayMinutes: 10 },
            { eventId: 'evt-001', stayMinutes: 10 },
          ],
          strategy: 'time-sort',
        })
        .expect(201);

      expect(res.body.stats.strategy).toBe('time-sort');

      // Time-sort should order by start time: evt-001 (14:00) before evt-002 (19:00)
      expect(res.body.legs[0].event.id).toBe('evt-001');
      expect(res.body.legs[1].event.id).toBe('evt-002');
    });

    it('should return 404 for unknown event ID', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/spree/compute')
        .send({
          homeLocation: { lat: 52.520, lng: 13.405 },
          startTime: '2026-04-05T10:00:00+02:00',
          endTime: '2026-04-05T23:00:00+02:00',
          selections: [
            { eventId: 'evt-nonexistent', stayMinutes: 10 },
          ],
          strategy: 'greedy',
        })
        .expect(404);

      expect(res.body.message).toContain('evt-nonexistent');
    });

    it('should validate request body — reject completely empty body', async () => {
      await request(app.getHttpServer())
        .post('/api/spree/compute')
        .send({})
        .expect(400);
    });

    it('should validate request body — reject invalid startTime', async () => {
      await request(app.getHttpServer())
        .post('/api/spree/compute')
        .send({
          homeLocation: { lat: 52.520, lng: 13.405 },
          startTime: 'not-a-date',
          endTime: '2026-04-05T23:00:00+02:00',
          selections: [],
          strategy: 'greedy',
        })
        .expect(400);
    });

    it('should validate request body — reject missing lat/lng in homeLocation', async () => {
      await request(app.getHttpServer())
        .post('/api/spree/compute')
        .send({
          homeLocation: { lat: 'abc' },
          startTime: '2026-04-05T10:00:00+02:00',
          endTime: '2026-04-05T23:00:00+02:00',
          selections: [],
          strategy: 'greedy',
        })
        .expect(400);
    });

    it('should handle empty selections gracefully', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/spree/compute')
        .send({
          homeLocation: { lat: 52.520, lng: 13.405 },
          startTime: '2026-04-05T10:00:00+02:00',
          endTime: '2026-04-05T23:00:00+02:00',
          selections: [],
          strategy: 'greedy',
        })
        .expect(201);

      expect(res.body.legs).toHaveLength(0);
      expect(res.body.totalDurationMinutes).toBe(0);
    });

    it('should default stayMinutes to 10 when not provided', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/spree/compute')
        .send({
          homeLocation: { lat: 52.520, lng: 13.405 },
          startTime: '2026-04-05T10:00:00+02:00',
          endTime: '2026-04-05T23:00:00+02:00',
          selections: [
            { eventId: 'evt-001' },
          ],
          strategy: 'greedy',
        })
        .expect(201);

      expect(res.body.legs[0].stayMinutes).toBe(10);
    });

    it('should default strategy to greedy when not provided', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/spree/compute')
        .send({
          homeLocation: { lat: 52.520, lng: 13.405 },
          startTime: '2026-04-05T10:00:00+02:00',
          endTime: '2026-04-05T23:00:00+02:00',
          selections: [
            { eventId: 'evt-001', stayMinutes: 10 },
          ],
        })
        .expect(201);

      expect(res.body.stats.strategy).toBe('greedy-nearest-time');
    });
  });
});
