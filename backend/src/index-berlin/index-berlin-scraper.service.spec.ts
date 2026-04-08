import { describe, it, expect, vi, beforeEach } from 'vitest';
import { IndexBerlinScraperService } from './index-berlin-scraper.service';

describe('IndexBerlinScraperService', () => {
  let service: IndexBerlinScraperService;

  beforeEach(() => {
    service = new IndexBerlinScraperService();
  });

  describe('scrapeVenues', () => {
    it('should parse venue list items from HTML', async () => {
      const html = `
        <ul>
          <li class="js-mapitem" data-type="venue" data-id="101"
              data-latitude="52.525" data-longitude="13.395"
              data-href="/venues/list/101/galerie-alpha">
            <a href="/venues/list/101/galerie-alpha">Galerie Alpha</a>
          </li>
          <li class="js-mapitem" data-type="venue" data-id="102"
              data-latitude="52.500" data-longitude="13.400"
              data-href="/venues/list/102/kunst-haus">
            <a href="/venues/list/102/kunst-haus">Kunst Haus</a>
          </li>
        </ul>
      `;

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        text: async () => html,
      } as Response);

      const venues = await service.scrapeVenues();

      expect(venues).toHaveLength(2);
      expect(venues[0]).toEqual({
        id: '101',
        name: 'Galerie Alpha',
        lat: 52.525,
        lng: 13.395,
        slug: 'galerie-alpha',
      });
      expect(venues[1].name).toBe('Kunst Haus');
    });

    it('should skip venues with missing coordinates', async () => {
      const html = `
        <ul>
          <li class="js-mapitem" data-type="venue" data-id="200"
              data-latitude="" data-longitude=""
              data-href="/venues/list/200/bad-venue">
            <a>Bad Venue</a>
          </li>
        </ul>
      `;

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        text: async () => html,
      } as Response);

      const venues = await service.scrapeVenues();
      expect(venues).toHaveLength(0);
    });
  });

  describe('scrapeEvents', () => {
    it('should parse events grouped by date', async () => {
      const html = `
        <div class="js-search-group" data-section="1">
          <h2 class="events__group-title">Friday, April 10</h2>
          <article class="event" data-id="500"
                   data-latitude="52.525" data-longitude="13.395"
                   data-venue="/venues/list/101/galerie-alpha">
            <h3 class="event__title">New Horizons</h3>
            <div class="event__location"><span>Galerie Alpha</span></div>
            <div class="event__date"><span>Opening 7–9pm</span></div>
          </article>
        </div>
      `;

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        text: async () => html,
      } as Response);

      const events = await service.scrapeEvents();

      expect(events).toHaveLength(1);
      expect(events[0].id).toBe('500');
      expect(events[0].title).toBe('New Horizons');
      expect(events[0].venueId).toBe('101');
      expect(events[0].venueName).toBe('Galerie Alpha');
      expect(events[0].startTime).toContain('T19:00:00');
      expect(events[0].endTime).toContain('T21:00:00');
    });

    it('should skip events without venue ID', async () => {
      const html = `
        <div class="js-search-group" data-section="1">
          <h2 class="events__group-title">Friday, April 10</h2>
          <article class="event" data-id="600"
                   data-latitude="52.525" data-longitude="13.395"
                   data-venue="">
            <h3 class="event__title">No Venue Event</h3>
            <div class="event__date"><span>8pm</span></div>
          </article>
        </div>
      `;

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        text: async () => html,
      } as Response);

      const events = await service.scrapeEvents();
      expect(events).toHaveLength(0);
    });
  });

  describe('time parsing (via scrapeEvents)', () => {
    async function parseTime(timeText: string): Promise<{ startTime: string; endTime: string }> {
      const html = `
        <div class="js-search-group" data-section="1">
          <h2 class="events__group-title">Saturday, April 11</h2>
          <article class="event" data-id="700"
                   data-latitude="52.5" data-longitude="13.4"
                   data-venue="/venues/list/1/x">
            <h3 class="event__title">Test</h3>
            <div class="event__location"><span>V</span></div>
            <div class="event__date"><span>${timeText}</span></div>
          </article>
        </div>
      `;
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        text: async () => html,
      } as Response);

      const events = await service.scrapeEvents();
      return { startTime: events[0].startTime, endTime: events[0].endTime };
    }

    it('should parse "Opening 7–9pm"', async () => {
      const { startTime, endTime } = await parseTime('Opening 7–9pm');
      expect(startTime).toContain('T19:00:00+02:00');
      expect(endTime).toContain('T21:00:00+02:00');
    });

    it('should parse "7pm" with default +2h end', async () => {
      const { startTime, endTime } = await parseTime('7pm');
      expect(startTime).toContain('T19:00:00');
      expect(endTime).toContain('T21:00:00');
    });

    it('should parse "6:30–9pm"', async () => {
      const { startTime, endTime } = await parseTime('6:30–9pm');
      expect(startTime).toContain('T18:30:00');
      expect(endTime).toContain('T21:00:00');
    });

    it('should parse "Opening 6–9pm" with en-dash', async () => {
      const { startTime, endTime } = await parseTime('Opening 6–9pm');
      expect(startTime).toContain('T18:00:00');
      expect(endTime).toContain('T21:00:00');
    });

    it('should default to 7pm when no time parseable', async () => {
      const { startTime, endTime } = await parseTime('TBA');
      expect(startTime).toContain('T19:00:00');
      expect(endTime).toContain('T21:00:00');
    });
  });
});
