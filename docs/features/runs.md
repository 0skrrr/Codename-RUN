# Runs

Status: idea. Every game action starts with a real run (or ride).

## Behaviour
- Before starting, the player picks a run type: **Territory Run** (capture hexes) or **Trade Route Run** (build a trade route instead).
- The app records the GPS track, including offline.
- When the run ends, the track is uploaded and the server decides what it earned.

## Rules
- The server is authoritative. Tracks are checked for impossible speed, teleport jumps and mock-location flags before anything is awarded.
- Cycling vs running: open question whether they earn the same.

## Open questions
- Minimum run length to count?
- Separate rules or balance for cycling?
