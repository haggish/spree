import { Injectable, Logger } from '@nestjs/common';
import { parse as parseHTML } from 'node-html-parser';

export interface IndexBerlinVenue {
  id: string;
  name: string;
  lat: number;
  lng: number;
  slug: string;
}

export interface IndexBerlinEvent {
  id: string;
  title: string;
  venueId: string;
  venueName: string;
  lat: number;
  lng: number;
  startTime: string; // ISO 8601
  endTime: string;   // ISO 8601
}

const VENUES_URL = 'https://www.indexberlin.com/venues/list/';
const EVENTS_URL = 'https://www.indexberlin.com/events/list/filter?ty=12614&&';

const MONTH_MAP: Record<string, number> = {
  january: 0, february: 1, march: 2, april: 3, may: 4, june: 5,
  july: 6, august: 7, september: 8, october: 9, november: 10, december: 11,
};

@Injectable()
export class IndexBerlinScraperService {
  private readonly logger = new Logger(IndexBerlinScraperService.name);

  async scrapeVenues(): Promise<IndexBerlinVenue[]> {
    this.logger.log('Scraping venues from Index Berlin...');
    const res = await fetch(VENUES_URL);
    const html = await res.text();
    const root = parseHTML(html);

    const items = root.querySelectorAll('li.js-mapitem[data-type="venue"]');
    const venues: IndexBerlinVenue[] = [];

    for (const li of items) {
      const id = li.getAttribute('data-id');
      const lat = parseFloat(li.getAttribute('data-latitude') || '');
      const lng = parseFloat(li.getAttribute('data-longitude') || '');
      const href = li.getAttribute('data-href') || '';
      const slug = href.split('/').pop() || '';
      const anchor = li.querySelector('a');
      const name = anchor?.text?.trim() || slug;

      if (!id || isNaN(lat) || isNaN(lng)) continue;
      venues.push({ id, name, lat, lng, slug });
    }

    this.logger.log(`Scraped ${venues.length} venues`);
    return venues;
  }

  async scrapeEvents(): Promise<IndexBerlinEvent[]> {
    this.logger.log('Scraping events (openings) from Index Berlin...');
    const res = await fetch(EVENTS_URL);
    const html = await res.text();
    const root = parseHTML(html);

    const sections = root.querySelectorAll('div.js-search-group[data-section]');
    const events: IndexBerlinEvent[] = [];

    for (const section of sections) {
      const dateStr = this.parseSectionDate(section);
      if (!dateStr) continue;

      const articles = section.querySelectorAll('article.event');
      for (const article of articles) {
        const ev = this.parseEvent(article, dateStr);
        if (ev) events.push(ev);
      }
    }

    this.logger.log(`Scraped ${events.length} events`);
    return events;
  }

  /**
   * Parse the section's title "Friday, April 10" into a YYYY-MM-DD string.
   */
  private parseSectionDate(section: ReturnType<typeof parseHTML>): string | null {
    const titleEl = section.querySelector('.events__group-title');
    if (!titleEl) return null;

    const text = titleEl.text.trim(); // e.g. "Friday, April 10"
    const match = text.match(/(\w+)\s+(\d{1,2})$/);
    if (!match) return null;

    const monthName = match[1].toLowerCase();
    const day = parseInt(match[2]);
    const month = MONTH_MAP[monthName];
    if (month === undefined) return null;

    // Infer year: use current year, but if the date is more than 6 months in the past, use next year
    const now = new Date();
    let year = now.getFullYear();
    const candidate = new Date(year, month, day);
    const sixMonthsAgo = new Date(now);
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    if (candidate < sixMonthsAgo) {
      year++;
    }

    const mm = String(month + 1).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    return `${year}-${mm}-${dd}`;
  }

  /**
   * Parse a single event article element.
   */
  private parseEvent(
    article: ReturnType<typeof parseHTML>,
    dateStr: string,
  ): IndexBerlinEvent | null {
    const id = article.getAttribute('data-id');
    const lat = parseFloat(article.getAttribute('data-latitude') || '');
    const lng = parseFloat(article.getAttribute('data-longitude') || '');
    const venueAttr = article.getAttribute('data-venue') || '';

    if (!id || isNaN(lat) || isNaN(lng)) return null;

    // Extract venue ID from data-venue="/venues/list/941/galerie-volker-diehl"
    const venueMatch = venueAttr.match(/\/venues\/list\/(\d+)\//);
    const venueId = venueMatch ? venueMatch[1] : '';
    if (!venueId) return null;

    // Event title
    const titleEl = article.querySelector('.event__title') || article.querySelector('.event__authors');
    const title = titleEl?.text?.trim() || 'Untitled';

    // Venue name
    const locationEl = article.querySelector('.event__location span');
    const venueName = locationEl?.text?.trim() || '';

    // Time parsing from .event__date
    const dateEl = article.querySelector('.event__date span');
    const timeText = dateEl?.text?.trim() || '';
    const { startTime, endTime } = this.parseTime(dateStr, timeText);

    return { id, title, venueId, venueName, lat, lng, startTime, endTime };
  }

  /**
   * Parse time text like "Opening 7–9pm", "Opening 7pm", "6–9pm" into ISO strings.
   */
  private parseTime(
    dateStr: string,
    timeText: string,
  ): { startTime: string; endTime: string } {
    // Strip "Opening" prefix and clean up
    const cleaned = timeText
      .replace(/opening/i, '')
      .replace(/\u00a0/g, ' ')  // &nbsp;
      .trim();

    // Match patterns: "7–9pm", "7pm", "6:30–9pm", "7:30pm"
    // The dash can be – (en-dash), — (em-dash), or - (hyphen)
    const match = cleaned.match(
      /(\d{1,2})(?::(\d{2}))?\s*(?:[–—-]\s*(\d{1,2})(?::(\d{2}))?)?\s*(am|pm)/i,
    );

    let startHour = 19; // default 7pm
    let startMin = 0;
    let endHour = 21;   // default 9pm (start + 2h)
    let endMin = 0;

    if (match) {
      startHour = parseInt(match[1]);
      startMin = match[2] ? parseInt(match[2]) : 0;
      const period = match[5].toLowerCase();

      if (period === 'pm' && startHour < 12) startHour += 12;
      if (period === 'am' && startHour === 12) startHour = 0;

      if (match[3]) {
        // End time provided
        endHour = parseInt(match[3]);
        endMin = match[4] ? parseInt(match[4]) : 0;
        if (period === 'pm' && endHour < 12) endHour += 12;
        if (period === 'am' && endHour === 12) endHour = 0;
      } else {
        // No end time — default +2h
        endHour = startHour + 2;
        endMin = startMin;
      }
    }

    const pad = (n: number) => String(n).padStart(2, '0');
    const offset = '+02:00'; // Berlin CEST
    const startTime = `${dateStr}T${pad(startHour)}:${pad(startMin)}:00${offset}`;
    const endTime = `${dateStr}T${pad(endHour)}:${pad(endMin)}:00${offset}`;

    return { startTime, endTime };
  }
}
