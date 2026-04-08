import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from './test-app';

describe('Events API (integration)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /api/events', () => {
    it('should return all events with venues', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/events')
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);

      const event = res.body[0];
      expect(event).toHaveProperty('id');
      expect(event).toHaveProperty('venue');
      expect(event.venue).toHaveProperty('location');
    });

    it('should filter events by time range', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/events')
        .query({
          startTime: '2026-04-05T10:00:00+02:00',
          endTime: '2026-04-05T15:00:00+02:00',
        })
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);

      // All returned events should overlap with the range
      for (const event of res.body) {
        const evStart = new Date(event.startTime).getTime();
        const evEnd = new Date(event.endTime).getTime();
        const rangeStart = new Date('2026-04-05T10:00:00+02:00').getTime();
        const rangeEnd = new Date('2026-04-05T15:00:00+02:00').getTime();
        expect(evStart < rangeEnd && evEnd > rangeStart).toBe(true);
      }
    });
  });

  describe('GET /api/events/:id', () => {
    it('should return a specific event with venue', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/events/evt-001')
        .expect(200);

      expect(res.body.id).toBe('evt-001');
      expect(res.body.name).toBe('Berlin Electronic Showcase');
      expect(res.body.venue.name).toBe('Berghain');
    });

    it('should return empty object for unknown event', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/events/evt-999')
        .expect(200);

      // findByIdWithVenue returns undefined → NestJS serializes as {}
      expect(res.body).not.toHaveProperty('id');
    });
  });
});
