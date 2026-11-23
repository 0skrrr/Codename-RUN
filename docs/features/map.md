# Map and hex grid

Status: idea. See [ADR 0003](../decisions/0003-hex-overlay-on-osm.md).

## Behaviour
- Normal OpenStreetMap-style base map.
- Hex grid drawn on top, computed for the visible area with H3.
- Owned hexes coloured by owner; strategic points and bases drawn as icons.

## Open questions
- Hex size. The team's favourite reference is street-level hexes (H3 resolution 11 or 12). Decide by prototyping.
- What zoomed-out views show (merged areas instead of single hexes).
