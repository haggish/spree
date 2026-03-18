package org.katastrofi.spree.schedules;

import org.katastrofi.spree.Range;
import org.katastrofi.spree.events.Event;
import org.katastrofi.spree.users.User;

import java.time.LocalDateTime;
import java.util.Set;

public interface Scheduler {
    Schedule scheduleFor(User user, Range<LocalDateTime> time, Set<Event> events);
}
