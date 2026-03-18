package org.katastrofi.spree.routes;

import org.katastrofi.spree.Location;

import java.time.LocalDateTime;

public interface Transits {
    Transit between(Location start, Location end, LocalDateTime time, Transit.Mode mode);
}
