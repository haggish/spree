import { describe, it, expect, vi, beforeEach } from 'vitest';
import { KulturdatenApiService } from './kulturdaten-api.service';

describe('KulturdatenApiService', () => {
  let service: KulturdatenApiService;

  beforeEach(() => {
    service = new KulturdatenApiService();
  });

  describe('fetchEvents', () => {
    it('should return filtered events for a date range', async () => {
      const mockEvents = [
        // Valid: published, scheduled, has time, has locations + attractions
        {
          identifier: 'E_VALID1',
          status: 'event.published',
          scheduleStatus: 'event.scheduled',
          schedule: { startDate: '2026-04-10', endDate: '2026-04-10', startTime: '19:00:00', endTime: '21:00:00' },
          locations: [{ referenceType: 'type.Location', referenceId: 'L_1', referenceLabel: { de: 'Ort A' } }],
          attractions: [{ referenceType: 'type.Attraction', referenceId: 'A_1', referenceLabel: { de: 'Konzert' } }],
        },
        // Filtered out: all-day event (startTime 00:00:00)
        {
          identifier: 'E_ALLDAY',
          status: 'event.published',
          scheduleStatus: 'event.scheduled',
          schedule: { startDate: '2026-04-10', endDate: '2026-04-10', startTime: '00:00:00', endTime: '00:00:00' },
          locations: [{ referenceType: 'type.Location', referenceId: 'L_2', referenceLabel: { de: 'Ort B' } }],
          attractions: [{ referenceType: 'type.Attraction', referenceId: 'A_2', referenceLabel: { de: 'Ausstellung' } }],
        },
        // Filtered out: cancelled
        {
          identifier: 'E_CANCELLED',
          status: 'event.published',
          scheduleStatus: 'event.cancelled',
          schedule: { startDate: '2026-04-10', endDate: '2026-04-10', startTime: '20:00:00', endTime: '22:00:00' },
          locations: [{ referenceType: 'type.Location', referenceId: 'L_3', referenceLabel: { de: 'Ort C' } }],
          attractions: [{ referenceType: 'type.Attraction', referenceId: 'A_3', referenceLabel: { de: 'Theater' } }],
        },
        // Filtered out: no locations
        {
          identifier: 'E_NOLOC',
          status: 'event.published',
          scheduleStatus: 'event.scheduled',
          schedule: { startDate: '2026-04-10', endDate: '2026-04-10', startTime: '18:00:00', endTime: '20:00:00' },
          locations: [],
          attractions: [{ referenceType: 'type.Attraction', referenceId: 'A_4', referenceLabel: { de: 'Lesung' } }],
        },
        // Filtered out: draft status
        {
          identifier: 'E_DRAFT',
          status: 'event.draft',
          scheduleStatus: 'event.scheduled',
          schedule: { startDate: '2026-04-10', endDate: '2026-04-10', startTime: '14:00:00', endTime: '16:00:00' },
          locations: [{ referenceType: 'type.Location', referenceId: 'L_5', referenceLabel: { de: 'Ort E' } }],
          attractions: [{ referenceType: 'type.Attraction', referenceId: 'A_5', referenceLabel: { de: 'Musik' } }],
        },
      ];

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        json: async () => ({
          success: true,
          data: { page: 1, pageSize: 500, totalCount: 5, events: mockEvents },
        }),
      } as Response);

      const result = await service.fetchEvents('2026-04-10', '2026-04-10');

      expect(result).toHaveLength(1);
      expect(result[0].identifier).toBe('E_VALID1');
    });

    it('should return empty array on API error', async () => {
      vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('Network error'));

      const result = await service.fetchEvents('2026-04-10', '2026-04-10');
      expect(result).toEqual([]);
    });

    it('should return empty array on unexpected response shape', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        json: async () => ({ success: false }),
      } as Response);

      const result = await service.fetchEvents('2026-04-10', '2026-04-10');
      expect(result).toEqual([]);
    });
  });

  describe('fetchLocation', () => {
    it('should return location data on success', async () => {
      const mockLocation = {
        identifier: 'L_ABC',
        title: { de: 'Kulturhaus' },
        address: { streetAddress: 'Musterstr. 1', postalCode: '10115', addressLocality: 'Berlin' },
        borough: 'Mitte',
      };

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        json: async () => ({ success: true, data: mockLocation }),
      } as Response);

      const result = await service.fetchLocation('L_ABC');
      expect(result).toEqual(mockLocation);
    });

    it('should return null on failure', async () => {
      vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('fail'));
      const result = await service.fetchLocation('L_BAD');
      expect(result).toBeNull();
    });
  });

  describe('fetchLocations', () => {
    it('should fetch multiple locations in parallel', async () => {
      const loc1 = { identifier: 'L_1', title: { de: 'A' } };
      const loc2 = { identifier: 'L_2', title: { de: 'B' } };

      vi.spyOn(globalThis, 'fetch')
        .mockResolvedValueOnce({ json: async () => ({ success: true, data: loc1 }) } as Response)
        .mockResolvedValueOnce({ json: async () => ({ success: true, data: loc2 }) } as Response);

      const result = await service.fetchLocations(['L_1', 'L_2']);
      expect(result.size).toBe(2);
      expect(result.get('L_1')).toEqual(loc1);
      expect(result.get('L_2')).toEqual(loc2);
    });
  });
});