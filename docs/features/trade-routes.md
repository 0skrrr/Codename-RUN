# Trade routes

Status: idea. The most complex mechanic; the worker (`apps/worker`) runs it.

## Behaviour
- Players send resources to each other, but resources travel **physically** along trade routes, like data through network cables.
- A **Trade Route Run** sets the run's path as a trade route instead of capturing territory.
- Resources move slowly (around 1 km/h) and can be watched moving on the map.
- Each route has a **capacity**; running a segment again raises its capacity.
- Whoever ran a segment (e.g. per kilometre) gets a small cut of everything that passes through it. If several people ran a segment, the cut is split by how many times each ran it.
- Shipments have a minimum size (hundreds, not "2").
- Routes act like rails: you can build around them.

## Open questions
- Only on your own territory, or anywhere?
- Crossing oceans: pre-built routes we place with fixed bandwidth, or ships/planes?
- How routes are maintained and destroyed.
