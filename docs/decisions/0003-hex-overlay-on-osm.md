# 0003. Normal OSM map with a computed hex overlay

Status: proposed
Date: 2026-11-23

## Context
The board asks whether the whole map is a hex grid or a normal map underneath. Converting the map itself to hexes is not realistic: full OpenStreetMap data is around 160 GB.

## Decision
- The base map is a normal OpenStreetMap-based tile map from a provider.
- The app draws a hex grid on top, computed with H3 for the visible area only.
- Owned hexes are coloured by owner; unowned hexes are just outlines (or hidden when zoomed out).
- One H3 resolution is used for gameplay. The board's favourite visual is street-level hexes; candidates are H3 resolution 11 (~25 m edge) or 12 (~10 m edge), to be chosen by prototyping.

## Alternatives considered
- **Pre-rendered hex map tiles** — pretty, but must be regenerated whenever the style changes and costs storage.
- **Square grid** — simpler maths, but hexes have equal distance to all neighbours and look like the reference images.

## Consequences
- Zooming out needs aggregation (show parent hexes or blobs) or the screen fills with millions of hexes.
- Map tile provider is an external dependency with its own pricing and terms.
