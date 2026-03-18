package org.katastrofi.spree.routes;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/transits")
public class TransitsViaREST {

    private final Transits transits;

    @Autowired
    public TransitsViaREST(Transits transits) {
        this.transits = transits;
    }

    @PostMapping
    public Transit forSpec(@RequestBody TransitSpec query) {
        return transits.between(query.start(), query.end(), query.time(), query.mode());
    }
}
