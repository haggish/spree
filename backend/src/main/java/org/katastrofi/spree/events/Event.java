package org.katastrofi.spree.events;

import org.katastrofi.spree.Identifiable;
import org.katastrofi.spree.venues.Venue;
import org.katastrofi.spree.Range;

import java.time.LocalDateTime;

public record Event(
        int id,
        String name,
        String author,
        Range<LocalDateTime> during,
        Venue venue
) implements Identifiable {
}
