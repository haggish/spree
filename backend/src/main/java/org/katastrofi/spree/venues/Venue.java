package org.katastrofi.spree.venues;

import org.katastrofi.spree.Identifiable;
import org.katastrofi.spree.Location;

public record Venue(int id, String name, Location location) implements Identifiable {
}
