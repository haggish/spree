package org.katastrofi.spree.schedules;

import org.katastrofi.spree.Location;
import org.katastrofi.spree.Range;
import org.katastrofi.spree.events.Event;
import org.katastrofi.spree.routes.Transit;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Set;

import static java.time.LocalDateTime.parse;

@RestController
@RequestMapping("/schedule")
public class ScheduleViaREST {

    @PostMapping("/make")
    public Schedule make(@RequestBody Set<Event> events) {
        return new Schedule(List.of(
                new Transit(
                        new Location(52.56048f, 13.460437f),
                        new Location(52.54256f, 13.498439f),
                        new Range<>(
                                parse("2026-03-21T18:00:00"),
                                parse("2026-03-21T21:00:00")
                        ),
                        Transit.Mode.PUBLIC_TRANSPORT
                )
        ));
    }
}
