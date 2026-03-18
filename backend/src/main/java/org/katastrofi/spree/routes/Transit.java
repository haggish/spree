package org.katastrofi.spree.routes;

import org.katastrofi.spree.Location;
import org.katastrofi.spree.Range;

import java.time.LocalDateTime;

public record Transit(Location start, Location end, Range<LocalDateTime> timeRange, Mode mode) {
    public enum Mode {
        WALK, PUBLIC_TRANSPORT
    }
}
