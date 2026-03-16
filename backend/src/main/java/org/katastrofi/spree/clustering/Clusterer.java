package org.katastrofi.spree.clustering;

import org.katastrofi.spree.Location;

import java.util.Set;

public interface Clusterer {
    Set<Cluster> cluster(Set<Location> locations, int k);
}
