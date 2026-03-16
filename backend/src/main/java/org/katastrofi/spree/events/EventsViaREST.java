package org.katastrofi.spree.events;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.format.DateTimeFormatter;
import java.util.Set;

import static java.time.LocalDate.parse;

@RestController
@RequestMapping("/events")
public class EventsViaREST {

    private static final DateTimeFormatter DATE_FORMATTER =
            DateTimeFormatter.ofPattern("dd-MM-yyyy");

    private final Events events;

    @Autowired
    EventsViaREST(Events events) {
        this.events = events;
    }

    @GetMapping
    Set<Event> all() {
        return events.all();
    }

    @GetMapping("/at/{dateString}")
    Set<Event> at(@PathVariable String dateString) {
        return events.at(parse(dateString, DATE_FORMATTER));
    }
}
