package org.katastrofi.spree;

import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;

import java.io.IOException;
import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

import static java.time.Instant.now;

public abstract class ScrapedObjects<T extends Identifiable> {

    private static final Duration CACHE_TTL = Duration.ofHours(6);

    private final String url;
    private final Function<Document, Map<Integer, T>> parser;

    private Map<Integer, T> cache = Map.of();
    private Instant cacheExpiresAt = Instant.MIN;

    protected ScrapedObjects(String url, Function<Document, Map<Integer, T>> parser) {
        this.url = url;
        this.parser = parser;
    }

    public Set<T> all() {
        return cache().values().stream().collect(Collectors.toUnmodifiableSet());
    }

    protected synchronized Map<Integer, T> cache() {
        if (now().isBefore(cacheExpiresAt)) {
            return cache;
        }

        Document doc;
        try {
            doc = Jsoup.connect(url).get();
        } catch (IOException e) {
            throw new RuntimeException("Failed to parse venues HTML resource", e);
        }

        cache = parser.apply(doc);
        cacheExpiresAt = now().plus(CACHE_TTL);

        return cache;
    }
}
