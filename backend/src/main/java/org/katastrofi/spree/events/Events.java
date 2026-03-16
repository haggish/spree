package org.katastrofi.spree.events;

import java.time.LocalDate;
import java.util.Set;

public interface Events {
    Set<Event> all();

    Set<Event> at(LocalDate date);
}
