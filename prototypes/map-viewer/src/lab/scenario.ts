import type { LngLat } from "./geo.ts";
import { seededRandom } from "./random.ts";
import { pickStartVertex, randomWalk, type RoadGraph } from "./roadGraph.ts";

export interface Player {
  id: number;
  color: string;
  heightFactor: number;
}

export interface Run {
  playerId: number;
  path: LngLat[];
}

export interface TradeRoute {
  id: number;
  path: LngLat[];
  bandwidth: number;
  bandwidthShare: number;
}

export interface Scenario {
  players: Player[];
  runs: Run[];
  tradeRoutes: TradeRoute[];
}

export interface ScenarioOptions {
  seed: number;
  players: number;
  runsPerPlayer: number;
  runLengthMeters: number;
  tradeRoutes: number;
}

export const PLAYER_COLORS = [
  "#e63946",
  "#1d70b8",
  "#2a9d8f",
  "#f4a261",
  "#8338ec",
  "#ffbe0b",
  "#06d6a0",
  "#ff006e",
] as const;

const GOLDEN_ANGLE_DEGREES = 137.508;
const GENERATED_SATURATION = 65;
const GENERATED_LIGHTNESS = 50;

export function playerColor(index: number): string {
  const fixed = PLAYER_COLORS[index];
  if (fixed) return fixed;
  return `hsl(${((index * GOLDEN_ANGLE_DEGREES) % 360).toFixed(1)}, ${GENERATED_SATURATION}%, ${GENERATED_LIGHTNESS}%)`;
}

const MIN_BANDWIDTH_EXPONENT = 1;
const BANDWIDTH_EXPONENT_RANGE = 2;
const MIN_HEIGHT_FACTOR = 0.4;
const HEIGHT_FACTOR_RANGE = 1.2;
const TRADE_ROUTE_LENGTH_FACTOR = 1.5;

export function generateScenario(graph: RoadGraph, options: ScenarioOptions): Scenario {
  const random = seededRandom(options.seed);
  const players: Player[] = [];
  const runs: Run[] = [];

  for (let id = 0; id < options.players; id++) {
    players.push({
      id,
      color: playerColor(id),
      heightFactor: MIN_HEIGHT_FACTOR + random() * HEIGHT_FACTOR_RANGE,
    });
    const home = pickStartVertex(graph, random);
    if (home === undefined) continue;
    for (let run = 0; run < options.runsPerPlayer; run++) {
      runs.push({ playerId: id, path: randomWalk(graph, home, options.runLengthMeters, random) });
    }
  }

  const tradeRoutes: TradeRoute[] = [];
  for (let id = 0; id < options.tradeRoutes; id++) {
    const start = pickStartVertex(graph, random);
    if (start === undefined) break;
    const exponent = MIN_BANDWIDTH_EXPONENT + random() * BANDWIDTH_EXPONENT_RANGE;
    const path = randomWalk(graph, start, options.runLengthMeters * TRADE_ROUTE_LENGTH_FACTOR, random);
    tradeRoutes.push({
      id,
      path,
      bandwidth: Math.round(10 ** exponent),
      bandwidthShare: (exponent - MIN_BANDWIDTH_EXPONENT) / BANDWIDTH_EXPONENT_RANGE,
    });
  }

  return { players, runs: runs.filter((run) => run.path.length > 1), tradeRoutes };
}
