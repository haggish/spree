package org.katastrofi.spree.clustering;

import org.katastrofi.spree.Location;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Random;
import java.util.Set;

public class KMeansClusterer implements Clusterer {

    private static final int MAX_ITERATIONS = 1000;

    @Override
    public Set<Cluster> cluster(Set<Location> locations, int k) {
        if (locations == null || locations.isEmpty()) {
            return Set.of();
        }
        if (k <= 0) {
            throw new IllegalArgumentException("k must be a positive integer");
        }
        if (k >= locations.size()) {
            // Each location gets its own cluster
            Set<Cluster> clusters = new HashSet<>();
            for (Location location : locations) {
                clusters.add(new Cluster(Set.of(location)));
            }
            return clusters;
        }

        List<Location> locationList = new ArrayList<>(locations);
        List<Location> centroids = initializeCentroids(locationList, k);

        Map<Location, Integer> assignments = new HashMap<>();

        for (int iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
            // Assign each venue to the nearest centroid
            Map<Location, Integer> newAssignments = assignToCentroids(locationList, centroids);

            // Check for convergence
            if (newAssignments.equals(assignments)) {
                break;
            }
            assignments = newAssignments;

            // Recompute centroids
            centroids = recomputeCentroids(locationList, assignments, k, centroids);
        }

        return buildClusters(locationList, assignments, k);
    }

    /**
     * Initializes centroids using the k-means++ strategy for better convergence.
     */
    private List<Location> initializeCentroids(List<Location> locations, int k) {
        Random random = new Random();
        LocalDateTime.now().withHour(23);
        List<Location> centroids = new ArrayList<>();

        // Pick first centroid randomly
        centroids.add(locations.get(random.nextInt(locations.size())));

        // Pick remaining centroids with probability proportional to squared distance
        for (int i = 1; i < k; i++) {
            double[] distances = new double[locations.size()];
            double totalDistance = 0.0;

            for (int j = 0; j < locations.size(); j++) {
                double minDist = Double.MAX_VALUE;
                for (Location centroid : centroids) {
                    double dist = squaredDistance(locations.get(j), centroid);
                    if (dist < minDist) {
                        minDist = dist;
                    }
                }
                distances[j] = minDist;
                totalDistance += minDist;
            }

            double threshold = random.nextDouble() * totalDistance;
            double cumulative = 0.0;
            int chosen = locations.size() - 1;
            for (int j = 0; j < locations.size(); j++) {
                cumulative += distances[j];
                if (cumulative >= threshold) {
                    chosen = j;
                    break;
                }
            }
            centroids.add(locations.get(chosen));
        }

        return centroids;
    }

    /**
     * Assigns each venue to the index of its nearest centroid.
     */
    private Map<Location, Integer> assignToCentroids(List<Location> locations, List<Location> centroids) {
        Map<Location, Integer> assignments = new HashMap<>();
        for (Location location : locations) {
            int nearest = 0;
            double minDist = Double.MAX_VALUE;
            for (int i = 0; i < centroids.size(); i++) {
                double dist = squaredDistance(location, centroids.get(i));
                if (dist < minDist) {
                    minDist = dist;
                    nearest = i;
                }
            }
            assignments.put(location, nearest);
        }
        return assignments;
    }

    /**
     * Recomputes centroids as the mean of all locations assigned to each cluster.
     * If a centroid has no assigned locations (empty cluster), it retains its previous position.
     */
    private List<Location> recomputeCentroids(List<Location> locations,
                                               Map<Location, Integer> assignments,
                                               int k,
                                               List<Location> previousCentroids) {
        float[] sumX = new float[k];
        float[] sumY = new float[k];
        int[] counts = new int[k];

        for (Location location : locations) {
            int cluster = assignments.get(location);
            sumX[cluster] += location.x();
            sumY[cluster] += location.y();
            counts[cluster]++;
        }

        List<Location> newCentroids = new ArrayList<>();
        for (int i = 0; i < k; i++) {
            if (counts[i] == 0) {
                // Retain previous centroid if cluster is empty
                newCentroids.add(previousCentroids.get(i));
            } else {
                newCentroids.add(new Location(sumX[i] / counts[i], sumY[i] / counts[i]));
            }
        }
        return newCentroids;
    }

    /**
     * Builds the final Set of Clusters from the assignment map.
     */
    private Set<Cluster> buildClusters(List<Location> locations,
                                        Map<Location, Integer> assignments,
                                        int k) {
        List<Set<Location>> clusterLocations = new ArrayList<>();
        for (int i = 0; i < k; i++) {
            clusterLocations.add(new HashSet<>());
        }

        for (Location location : locations) {
            clusterLocations.get(assignments.get(location)).add(location);
        }

        Set<Cluster> clusters = new HashSet<>();
        for (Set<Location> clusterGroup : clusterLocations) {
            if (!clusterGroup.isEmpty()) {
                clusters.add(new Cluster(clusterGroup));
            }
        }
        return clusters;
    }

    private double squaredDistance(Location a, Location b) {
        double dx = a.x() - b.x();
        double dy = a.y() - b.y();
        return dx * dx + dy * dy;
    }
}