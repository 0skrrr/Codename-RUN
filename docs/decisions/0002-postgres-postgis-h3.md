# 0002. PostgreSQL + PostGIS + H3 as the database

Status: proposed
Date: 2026-11-23

## Context
Almost every question the game asks is geographic: which hexes did this run cross, who owns the hexes near me, is this point within 30 m of a strategic location, how long is this route segment. Ownership changes must be consistent when two players fight over the same area.

## Decision
- **PostgreSQL** as the only primary database.
- **PostGIS** for geometry (runs as `LineString`, strategic points as `Point`, distance and intersection queries).
- **H3** (Uber's hexagonal grid, via the `h3-pg` extension or the H3 library in the API) to turn coordinates into hex IDs. Hex ownership is a table keyed by H3 index.
- **Redis** is added later, only for leaderboards/caching when needed.

## Alternatives considered
- **MongoDB / Firestore** — flexible, but geo support is basic and multi-row transactions (capturing many hexes at once) are harder.
- **Storing our own hex grid of the whole map** — impossible at planet scale; H3 computes any hex from coordinates instead.

## Consequences
- Territory size is just a count of rows ("70K base", "our clan hit 1M").
- Clan/area totals and leaderboards are SQL queries.
- Managed hosting must support PostGIS (Supabase, Neon, AWS RDS, etc. do).
