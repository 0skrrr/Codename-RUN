# Codename RUN — what we're building

Working name. Favourite so far: **OUTRUNNER**. Team: **R&Run**.

## The problem
People struggle to stay motivated to be physically active. There is no satisfying version of a game that fixes that.

## The idea
A territory-based running (and cycling) app with strategy and trading. Your real-world runs are your moves in the game:

1. Plan a route with strategic goals.
2. Run it in the real world.
3. Capture territory, strategic points and resources.
4. Compete or cooperate with people in your area.

## How it looks
- A normal map (OpenStreetMap style) with a fine **hexagon grid** on top.
- Your territory is a coloured area of hexes; each player/clan has a colour.
- Your **base** is an icon in the middle of your territory.
- **Strategic points** (towers, landmarks) are pins on the map.
- Trade routes look like rails through the hexes, with resources visibly moving along them.
- Territory size is counted in hexes: "I have a 70K base, our clan just hit 1M."

The full brainstorm, references and competitor screenshots live in the team FigJam.

## Core features
| Feature | Doc |
|---|---|
| Recording runs | [features/runs.md](features/runs.md) |
| Map and hex grid | [features/map.md](features/map.md) |
| Capturing territory | [features/territory.md](features/territory.md) |
| Strategic points | [features/strategic-points.md](features/strategic-points.md) |
| Bases | [features/bases.md](features/bases.md) |
| Trade routes | [features/trade-routes.md](features/trade-routes.md) |
| Players and clans | [features/players.md](features/players.md) |

## Later ideas
- Route suggestions.
- Smartwatch integration.

## Similar apps we looked at
Territory-capture running apps, hex-based walking games, street-coverage trackers (CityStrides-style), and location games like Farozonen. Ours adds strategy, upgrades and a trading economy on top of capturing.

See [architecture.md](architecture.md) for how it's built.
