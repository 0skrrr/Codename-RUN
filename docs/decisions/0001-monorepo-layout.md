# 0001. One repository: apps, packages, docs

Status: proposed
Date: 2026-11-23

## Context
We need a mobile app, a backend API, background jobs, and game rules shared between them. The team is small and everyone touches several parts.

## Decision
One monorepo:

- `apps/mobile` — the phone app (frontend)
- `apps/api` — the backend API, owns the database (`apps/api/db`)
- `apps/worker` — background jobs (trade-route flow, cooldowns)
- `packages/game-rules` — pure game logic shared by app and API
- `packages/api-contract` — request/response schemas shared by app and API
- `infra` — local dev and deployment config
- `locales`, `docs` — at the root, shared by everything

Inside every app, code is organized by feature (`src/features/<feature>`), as AGENTS.md requires.

## Alternatives considered
- **Separate repos for app and backend** — cleaner ownership, but every API change becomes two coordinated PRs and shared types drift.
- **Backend-as-a-service only (e.g. Firebase)** — fast start, but game rules and anti-cheat must run on a server we control, and geo queries are weak.

## Consequences
- One PR can change the API, the contract and the app together.
- We need a workspace tool (e.g. pnpm workspaces) once code exists.
- CI must only run checks for the parts a PR touches, or it will get slow.
