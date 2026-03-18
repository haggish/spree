package org.katastrofi.spree.routes;

import org.katastrofi.spree.Location;
import org.katastrofi.spree.Range;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.time.Duration;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;

import org.katastrofi.spree.routes.RouteRequest.Waypoint;
import org.katastrofi.spree.routes.RouteRequest.Waypoint.WaypointLocation;
import org.katastrofi.spree.routes.RouteRequest.Waypoint.WaypointLocation.LatLng;

import static java.time.ZoneOffset.UTC;
import static java.time.format.DateTimeFormatter.ISO_OFFSET_DATE_TIME;

@Component
public class GoogleMapsRouteAPIBasedTransits implements Transits {

    private static final String ROUTES_API_URL =
            "https://routes.googleapis.com/directions/v2:computeRoutes";

    private final String apiKey;
    private final RestClient restClient;

    public GoogleMapsRouteAPIBasedTransits(@Value("${google.maps.api.key}") String apiKey,
                                           RestClient restClient) {
        this.apiKey = apiKey;
        this.restClient = restClient;
    }

    @Override
    public Transit between(Location start, Location end, LocalDateTime time, Transit.Mode mode) {
        String travelMode = switch (mode) {
            case WALK -> "WALK";
            case PUBLIC_TRANSPORT -> "TRANSIT";
        };

        RouteRequest requestBody = new RouteRequest(
                Waypoint.from(start),
                Waypoint.from(end),
                travelMode,
                time.atOffset(UTC).format(ISO_OFFSET_DATE_TIME)
        );

        Map<?, ?> response = restClient.post()
                .uri(ROUTES_API_URL)
                .header("X-Goog-Api-Key", apiKey)
                .header("X-Goog-FieldMask", "routes.duration")
                .body(requestBody)
                .retrieve()
                .body(Map.class);

        if (response == null) {
            throw new IllegalStateException("No response from Google Routes API");
        }

        Duration duration = parseDuration(response);

        return new Transit(start, end, new Range<>(time, time.plus(duration)), mode);
    }

    private Duration parseDuration(Map<?, ?> response) {
        List<?> routes = (List<?>) response.get("routes");
        Map<?, ?> route = (Map<?, ?>) routes.getFirst();
        String durationStr = (String) route.get("duration");
        return Duration.parse("PT" + durationStr.toUpperCase());
    }
}
