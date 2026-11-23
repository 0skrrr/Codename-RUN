# Codename RUN

A territory-based running game: run in the real world to capture hexes on the map, take strategic points, build bases and trade resources along routes you've run.

**Status:** concept and repo setup. No app code yet.

## Start here
- [AGENTS.md](AGENTS.md) — how we work (humans and AI agents). Read it before your first change.
- [docs/overview.md](docs/overview.md) — what the game is.
- [docs/architecture.md](docs/architecture.md) — how it will be built.
- [docs/decisions/](docs/decisions/) — big technical decisions (currently all *proposed*).
- [docs/features/](docs/features/) — one file per game feature.

## Repository layout
```
apps/
  mobile/     phone app (frontend)
  api/        backend API, owns the database (api/db/migrations, api/db/seeds)
  worker/     background jobs (trade routes, cooldowns)
packages/
  game-rules/     pure game logic shared by app and API
  api-contract/   request/response schemas shared by app and API
infra/        local dev and deployment config
locales/      UI translations (en.json is the source of truth)
docs/         overview, architecture, decisions, features, README archive
.readme-changes/  README change notes, one per PR (see AGENTS.md §6)
```
