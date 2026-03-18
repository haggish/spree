package org.katastrofi.spree.schedules;

import org.katastrofi.spree.Range;
import org.katastrofi.spree.events.Event;
import org.katastrofi.spree.routes.Transits;
import org.katastrofi.spree.users.User;

import java.time.LocalDateTime;
import java.util.Set;

public class SchedulerImpl implements Scheduler {

    private final Transits transits;

    public SchedulerImpl(Transits transits) {
        this.transits = transits;
    }

    @Override
    public Schedule scheduleFor(User user, Range<LocalDateTime> time, Set<Event> events) {
        return null;
    }
}
