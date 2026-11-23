# Decisions

Big technical choices are recorded here, one file each: `NNNN-short-title.md`. Copy [0000-template.md](0000-template.md) to start a new one.

## Decisions can change
Nothing here is permanent. A decision records what we chose **and why at the time**, so that when we change our mind we know what we're changing.

To change one:
1. Open an issue explaining what changed (new facts, a failed prototype, a better option).
2. Write a **new** decision file with the next number. Say which decision it replaces.
3. Set the old file's status to `superseded by NNNN`. Don't rewrite or delete the old file — its reasoning stays as history.

Small corrections (typos, clearer wording, extra context) can be edited in place.

## Statuses
- `proposed` — open for discussion, not built on yet.
- `accepted` — we build on it until a new decision supersedes it.
- `superseded by NNNN` — replaced; kept for history.

## Index
| # | Decision | Status |
|---|---|---|
| [0001](0001-monorepo-layout.md) | One repository: apps, packages, docs | proposed |
| [0002](0002-postgres-postgis-h3.md) | PostgreSQL + PostGIS + H3 as the database | proposed |
| [0003](0003-hex-overlay-on-osm.md) | Normal OSM map with a computed hex overlay | proposed |
| [0004](0004-typescript-everywhere.md) | TypeScript across app, API and worker | accepted (for now) |
