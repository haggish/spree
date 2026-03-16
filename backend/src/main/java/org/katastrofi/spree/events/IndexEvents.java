package org.katastrofi.spree.events;

import org.jsoup.nodes.Element;
import org.jsoup.select.Elements;
import org.katastrofi.spree.Range;
import org.katastrofi.spree.ScrapedObjects;
import org.katastrofi.spree.venues.Venue;
import org.katastrofi.spree.venues.Venues;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.Month;
import java.time.Year;
import java.time.format.TextStyle;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import static java.lang.Integer.parseInt;
import static java.util.stream.Collectors.toSet;

@Component
public class IndexEvents extends ScrapedObjects<Event> implements Events {

    private static final String HTML_RESOURCE =
            "https://www.indexberlin.com/events/list/filter?ty=12614&&";

    // Matches data-section like "anything-january-15"
    // Group 1: x (prefix, ignored), group 2: y (month name), group 3: z (day)
    private static final Pattern SECTION_PATTERN =
            Pattern.compile("^(.+)-([a-z]+)-(\\d{1,2})$");

    // Matches venueID from data-venue="/venues/list/42/anything"
    private static final Pattern VENUE_ID_PATTERN =
            Pattern.compile("^/venues/list/(\\d+)/");

    // Matches 12-hour time token like "8pm", "11am"
    private static final Pattern HOUR_12H_PATTERN =
            Pattern.compile("^(\\d{1,2})(am|pm)$", Pattern.CASE_INSENSITIVE);

    @Autowired
    public IndexEvents(Venues venues) {
        super(HTML_RESOURCE, doc -> {
            Map<Integer, Event> result = new HashMap<>();
            int currentYear = Year.now().getValue();

            Elements dayElements = doc.select("div.js-search-group[data-section]");

            for (Element dayElement : dayElements) {
                String dataSection = dayElement.attr("data-section");
                Matcher sectionMatcher = SECTION_PATTERN.matcher(dataSection);
                if (!sectionMatcher.matches()) {
                    continue;
                }

                String monthName = sectionMatcher.group(2); // e.g. "january"
                int day = parseInt(sectionMatcher.group(3));

                Month month = parseMonthName(monthName);
                if (month == null) {
                    continue;
                }

                LocalDateTime currentDate = LocalDateTime.of(currentYear, month, day, 0, 0);

                Elements eventElements = dayElement.select("article.event[data-venue]");

                for (Element eventElement : eventElements) {
                    String dataVenue = eventElement.attr("data-venue");
                    int id = parseInt(eventElement.attr("data-id"));
                    Matcher venueMatcher = VENUE_ID_PATTERN.matcher(dataVenue);
                    if (!venueMatcher.find()) {
                        continue;
                    }
                    int venueId = parseInt(venueMatcher.group(1));

                    String name = textOf(eventElement, "a.event__title");
                    String author = textOf(eventElement, "a.event__authors");
                    String dateText = eventElement.select("div[class=event__date]")
                            .select("span").getFirst().ownText();

                    Range<LocalDateTime> during = parseTime(dateText, currentDate);
                    Venue venue = venues.byID(venueId);

                    result.put(id, new Event(id, name, author, during, venue));
                }
            }
            return result;
        });
    }

    @Override
    public Set<Event> at(LocalDate date) {
        return all().stream()
                .filter(e -> e.during() != null &&
                        e.during().start().toLocalDate().equals(date))
                .collect(toSet());
    }

    // -------------------------------------------------------------------------
    // HTML helpers
    // -------------------------------------------------------------------------

    private static String textOf(Element parent, String cssSelector) {
        Element el = parent.selectFirst(cssSelector);
        return el != null ? el.text() : "";
    }

    // -------------------------------------------------------------------------
    // Month parsing
    // -------------------------------------------------------------------------

    /**
     * Converts an English lowercase month name (e.g. "january") to a {@link Month},
     * or returns null if not recognised.
     */
    private static Month parseMonthName(String name) {
        for (Month m : Month.values()) {
            if (m.getDisplayName(TextStyle.FULL, Locale.ENGLISH).equalsIgnoreCase(name)) {
                return m;
            }
        }
        return null;
    }

    // -------------------------------------------------------------------------
    // Time parsing
    // -------------------------------------------------------------------------

    /**
     * Parses the time text of an event element into a {@code Range<LocalDateTime>}.
     * <p>
     * Jsoup decodes HTML entities in {@code .text()}, so:
     * <ul>
     *   <li>{@code &nbsp;}  → U+00A0 (non-breaking space)</li>
     *   <li>{@code &ndash;} → U+2013 (en-dash)</li>
     * </ul>
     *
     * @param rawText     decoded text from the event__date anchor
     * @param currentDate a LocalDateTime representing the event day (hour/minute = 0)
     * @return a {@code Range<LocalDateTime>}, or {@code null} when no valid time is found
     */
    static Range<LocalDateTime> parseTime(String rawText, LocalDateTime currentDate) {
        // Strip regular spaces, non-breaking spaces (U+00A0), and other whitespace
        String trimmed = rawText.replaceAll("[\\s\u00A0]+", "");

        if (trimmed.isEmpty()) {
            return null;
        }

        // Jsoup renders &ndash; as the Unicode en-dash U+2013
        final String EN_DASH = "\u2013";

        if (!trimmed.contains(EN_DASH)) {
            // ── Single time, e.g. "8pm" ──────────────────────────────────────
            Integer hour = parse12hToHour(trimmed);
            if (hour == null) {
                return null;
            }
            return Range.starting(currentDate.withHour(hour));

        } else {
            // ── Range time, e.g. "2–6pm" or "11am–2pm" ───────────────────────
            String[] parts = trimmed.split(EN_DASH, 2);
            String startRaw = parts[0];
            String endRaw = parts[1];

            // If start has no am/pm suffix, borrow it from end: "2-6pm" → "2pm-6pm"
            if (!hasAmPm(startRaw) && hasAmPm(endRaw)) {
                String suffix = endRaw.substring(endRaw.length() - 2);
                startRaw = startRaw + suffix;
            }

            Integer startHour = parse12hToHour(startRaw);
            Integer endHour = parse12hToHour(endRaw);

            if (startHour == null || endHour == null) {
                return null;
            }

            LocalDateTime startDateTime = currentDate.withHour(startHour);
            LocalDateTime endDateTime = currentDate.withHour(endHour);

            return new Range<>(startDateTime, endDateTime);
        }
    }

    /**
     * Converts a 12-hour token (e.g. "8pm", "11am") to a 24-hour integer,
     * or returns {@code null} if the format is not recognised.
     * <ul>
     *   <li>12am → 0 (midnight)</li>
     *   <li>12pm → 12 (noon)</li>
     * </ul>
     */
    private static Integer parse12hToHour(String token) {
        Matcher m = HOUR_12H_PATTERN.matcher(token.trim());
        if (!m.matches()) {
            return null;
        }
        int hour = parseInt(m.group(1));
        String period = m.group(2).toLowerCase();

        if (period.equals("am")) {
            return (hour == 12) ? 0 : hour;
        } else {
            return (hour == 12) ? 12 : hour + 12;
        }
    }

    /**
     * Returns true if the token ends with "am" or "pm" (case-insensitive).
     */
    private static boolean hasAmPm(String token) {
        if (token.length() < 2) return false;
        String suffix = token.substring(token.length() - 2).toLowerCase();
        return suffix.equals("am") || suffix.equals("pm");
    }
}