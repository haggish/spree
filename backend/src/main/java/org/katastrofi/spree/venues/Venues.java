package org.katastrofi.spree.venues;

import java.util.Set;

public interface Venues {
    Set<Venue> all();

    Venue byID(int id);
}
