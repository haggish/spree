package org.katastrofi.spree.venues;

import org.jsoup.nodes.Element;
import org.katastrofi.spree.Location;
import org.katastrofi.spree.ScrapedObjects;
import org.springframework.stereotype.Component;

import static java.lang.Float.parseFloat;
import static java.lang.Integer.parseInt;
import static java.util.stream.Collectors.toUnmodifiableMap;

@Component
public class IndexVenues extends ScrapedObjects<Venue> implements Venues {
    private static final String HTML_RESOURCE = "https://www.indexberlin.com/venues/list/";

    IndexVenues() {
        super(HTML_RESOURCE, doc -> doc.select("li[data-type=venue]")
                .stream()
                .map(IndexVenues::toVenue)
                .collect(toUnmodifiableMap(Venue::id, v -> v)));
    }

    @Override
    public Venue byID(int id) {
        return cache().get(id);
    }

    private static Venue toVenue(Element li) {
        int id = parseInt(li.attr("data-id"));
        String name = li.selectFirst("a").text();
        float x = parseFloat(li.attr("data-latitude"));
        float y = parseFloat(li.attr("data-longitude"));
        return new Venue(id, name, new Location(x, y));
    }
}