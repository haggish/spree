# Routing

## Concepts

- **Location**: a geographical location with x and y coordinates
- **Home**: the starting point of a schedule
  - has a location
  - only one home per user
- **Venue**: a place where a user can go to
  - A venue can have event(s)
  - A venue has a location
- **Event**: a specific activity that a user can go to at a venue
  - An event has a starting time, and it can have an ending time
  - An event can be visited only within starting and ending times
  - An event is in a venue
- **Cluster**: a group of home or venue locations that are close to each other
  - A cluster has a location that is the centroid calculated from its locations
  - Venue locations within a cluster must be within 0,5 km of the centroid
  - A location can belong only to one cluster
- **Travel mode**: a means of transportation
  - walking or public transport
- **Transit**: a transportation between two locations
  - has a starting location and an ending location
  - has a specific travel mode
  - has starting and ending time
- **Transit duration**: the difference of Transit's ending time starting time
- **Visited event**: an event whose venue location is an ending location of a Transit in a schedule
- **Visited cluster**: a cluster whose events are all visited
- **Schedule**: a set of time-ordered Transits that fit within a certain starting and ending time
  - starting time of a Transit must be after the ending time of the previous Transit
  - within a schedule, a Transit can have a certain ending location only once
- **Visiting time**: 10 minutes
- **User**: a person who wants to go to a venue for an event
  - The user has a home location
  - The user has current location
  - The user has current cluster
  - The user moves between locations via Transits
  - The user has limited time for the Schedule: a starting time and an ending time

## Algorithm to build a schedule

### Purpose

The purpose is to visit as many events as possible within the user's time. This involves minimizing the duration of Transits.

### Inputs

- events
- user's time
  - starting time
  - ending time
- user's home location

### Output

- schedule of Transits

### State

- user
  - current location
  - current cluster
- current time

### Eligible events

Events are eligible
- if they are within the user's time
- they are not already scheduled

### Algorithm

  - filter out non-eligible events
  - find the set of clusters that contain all the scheduled events
  - construct the schedule for the user:
    - initialize the current location to the home location
    - initialize the current cluster to the cluster that contains the home location
    - initialize the current time to the user's starting time
  - while the current time is within the user's time:
    - until there are no next clusters,
      - visit the current cluster
      - go to the next cluster
    - if the schedule does not fit into user's time,
      - do one of the following (in order) and rerun the algorithm until it fits:
        - filter out clusters that contain only one event
        - remove the latest Transit from the schedule

### Definition: Next cluster
- If all the clusters are visited, there is no next cluster
- Otherwise the next cluster is the cluster with the nearest location

### Definition: Next event in next cluster
- if there is a next cluster, the next event is the event with nearest location in the next cluster
- if there is no next cluster, there is no next event

### Definition: Next event in current cluster
- The next event is the event with nearest location in the current cluster that is not visited yet
- There is no next event in the current cluster if all its events are visited

### Definition: Nearest location
Given current location and current time, the nearest location Xi in set of locations X is the location that has the Transit with the shortest Transit duration when built from:
  - current location start location
  - Xi.location end location
  - current time start time

### Definition: Go to next cluster
- Change the current cluster to the next cluster
- Visit the next event in the current cluster

### Definition: Visit cluster
- Until all the events in the cluster are visited:
  - visit the next event in current cluster

### Definition: Visiting an event
- To the schedule, add a Transit between the current location and the event's location
- Update the current time to the Transit's ending time plus visiting time
- Update the current location to the event's location


### Definition: Add a Transit
- Using Google Routes API, find a route between the current location and the next event's location at current time
- from the route, add a Transit to the schedule having:
  - current location start location
  - next event's location end location
  - current time start time
  - the route's duration
- Update the current location to the next event's location
