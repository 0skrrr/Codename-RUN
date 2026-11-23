# 0004. TypeScript across app, API and worker

Status: accepted (for now — see "When to revisit")
Date: 2026-11-23

## Context
The app needs background GPS on iOS and Android. Game rules must run identically on the phone (preview) and the server (truth).

## Decision
- **Mobile:** React Native with Expo — one codebase for iOS and Android, mature location and maps libraries.
- **API and worker:** Node.js with TypeScript.
- **Shared:** `packages/game-rules` and `packages/api-contract` (schema validation with Zod) are plain TypeScript, imported by both sides.

## Alternatives considered
- **Native Swift + Kotlin** — best GPS/battery control, but two apps for a small team.
- **Flutter + any backend** — good app framework, but game rules would be written twice (Dart and the server language).
- **Python backend** — fine, but loses shared rules and types with the app.

## Consequences
- One language for the whole team; anyone can work on any part.
- Background location on iOS needs careful testing on real devices.
- If GPS accuracy/battery becomes a real problem, the tracking module can be rewritten natively later without touching the rest.

## When to revisit
Open a new decision that supersedes this one if any of these happen:
- The background GPS prototype on real iOS and Android phones is unreliable or drains the battery, and native tracking modules don't fix it.
- Most of the team turns out to be much faster in another stack (e.g. Flutter, native).
- The API hits performance limits that profiling traces to Node itself, not to the database.
