package org.katastrofi.spree.venues;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Set;

@RestController
@RequestMapping("/venues")
public class VenuesViaREST {

    private final Venues venues;

    @Autowired
    public VenuesViaREST(Venues venues) {
        this.venues = venues;
    }

    @GetMapping
    Set<Venue> all() {
        return venues.all();
    }
}
