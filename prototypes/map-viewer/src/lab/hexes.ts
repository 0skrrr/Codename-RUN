import {
  cellsToMultiPolygon,
  cellToBoundary,
  cellToChildrenSize,
  cellToParent,
  getHexagonEdgeLengthAvg,
  getResolution,
  getHexagonAreaAvg,
  gridDisk,
  gridPathCells,
  latLngToCell,
  polygonToCells,
} from "h3-js";
import { featureCollection, type LabFeature, type LabFeatureCollection, type LngLat } from "./geo.ts";
import type { Player, Run, TradeRoute } from "./scenario.ts";

export type Bounds = [west: number, south: number, east: number, north: number];

export interface OwnedCell {
  playerId: number;
  share: number;
}

const EARTH_CIRCUMFERENCE_METERS = 40_075_016.686;
const MAPLIBRE_TILE_PIXELS = 512;
const COARSEST_RESOLUTION = 0;

const PATH_CELL_WEIGHT = 3;
const GROWTH_CELL_WEIGHT = 1;
const KILOMETERS_PER_DEGREE_LATITUDE = 111.32;
const DEGREES_TO_RADIANS = Math.PI / 180;

export function pathCells(path: readonly LngLat[], resolution: number): string[] {
  const cells: string[] = [];
  for (const [longitude, latitude] of path) {
    const cell = latLngToCell(latitude, longitude, resolution);
    const last = cells[cells.length - 1];
    if (cell === last) continue;
    if (last === undefined) {
      cells.push(cell);
      continue;
    }
    cells.push(...connectingCells(last, cell));
  }
  return cells;
}

export function territoryOwnership(
  runs: readonly Run[],
  resolution: number,
  growth: number,
): Map<string, number> {
  const scores = new Map<string, Map<number, number>>();
  const addScore = (cell: string, playerId: number, weight: number): void => {
    const byPlayer = scores.get(cell) ?? new Map<number, number>();
    byPlayer.set(playerId, (byPlayer.get(playerId) ?? 0) + weight);
    scores.set(cell, byPlayer);
  };

  for (const run of runs) {
    const visited = new Set(pathCells(run.path, resolution));
    for (const cell of visited) addScore(cell, run.playerId, PATH_CELL_WEIGHT);
    if (growth === 0) continue;
    const grown = new Set([...visited].flatMap((cell) => gridDisk(cell, growth)));
    for (const cell of grown) if (!visited.has(cell)) addScore(cell, run.playerId, GROWTH_CELL_WEIGHT);
  }

  const owners = new Map<string, number>();
  for (const [cell, byPlayer] of scores) owners.set(cell, strongestPlayer(byPlayer));
  return owners;
}

export function fullyOwned(owners: ReadonlyMap<string, number>): Map<string, OwnedCell> {
  return new Map([...owners].map(([cell, playerId]) => [cell, { playerId, share: 1 }]));
}

export type AggregationRule = "mostOfClaimed" | "majorityOfArea";

const AREA_MAJORITY = 0.5;

export function aggregateOwnership(
  owners: ReadonlyMap<string, number>,
  resolution: number,
  minShare: number,
  rule: AggregationRule = "mostOfClaimed",
): Map<string, OwnedCell> {
  let childResolution = resolution;
  const countsByParent = new Map<string, Map<number, number>>();
  for (const [cell, playerId] of owners) {
    childResolution = Math.max(childResolution, getResolution(cell));
    const parent = cellToParent(cell, resolution);
    const counts = countsByParent.get(parent) ?? new Map<number, number>();
    counts.set(playerId, (counts.get(playerId) ?? 0) + 1);
    countsByParent.set(parent, counts);
  }

  const aggregated = new Map<string, OwnedCell>();
  for (const [parent, counts] of countsByParent) {
    const playerId = strongestPlayer(counts);
    const owned = counts.get(playerId) ?? 0;
    if (rule === "majorityOfArea") {
      const share = owned / cellToChildrenSize(parent, childResolution);
      if (share > AREA_MAJORITY) aggregated.set(parent, { playerId, share });
      continue;
    }
    const total = [...counts.values()].reduce((sum, count) => sum + count, 0);
    const share = owned / total;
    if (share >= minShare) aggregated.set(parent, { playerId, share });
  }
  return aggregated;
}

export function displayResolution(
  baseResolution: number,
  zoom: number,
  latitude: number,
  minHexPixels: number,
): number {
  const metersPerPixel =
    (EARTH_CIRCUMFERENCE_METERS * Math.cos(latitude * DEGREES_TO_RADIANS)) / (MAPLIBRE_TILE_PIXELS * 2 ** zoom);
  let resolution = baseResolution;
  while (resolution > COARSEST_RESOLUTION && getHexagonEdgeLengthAvg(resolution, "m") / metersPerPixel < minHexPixels) {
    resolution--;
  }
  return resolution;
}

export function territoryFeatures(owned: ReadonlyMap<string, OwnedCell>, players: readonly Player[]): LabFeatureCollection {
  const features: LabFeature[] = [];
  const cellsByPlayer = new Map<number, string[]>();
  for (const [cell, { playerId, share }] of owned) {
    const player = players[playerId];
    if (!player) continue;
    features.push(cellFeature(cell, { shape: "cell", color: player.color, heightFactor: player.heightFactor, share }));
    const playerCells = cellsByPlayer.get(playerId);
    if (playerCells) playerCells.push(cell);
    else cellsByPlayer.set(playerId, [cell]);
  }
  for (const [playerId, cells] of cellsByPlayer) {
    const player = players[playerId] as Player;
    features.push({
      type: "Feature",
      geometry: { type: "MultiPolygon", coordinates: cellsToMultiPolygon(cells, true) as LngLat[][][] },
      properties: { shape: "merged", color: player.color, heightFactor: player.heightFactor },
    });
  }
  return featureCollection(features);
}

export function runFeatures(
  runs: readonly Run[],
  players: readonly Player[],
  resolution: number,
): { lines: LabFeatureCollection; cells: LabFeatureCollection } {
  const lines: LabFeature[] = [];
  const cells: LabFeature[] = [];
  for (const run of runs) {
    const color = players[run.playerId]?.color ?? "#000000";
    lines.push({ type: "Feature", geometry: { type: "LineString", coordinates: run.path }, properties: { color } });
    for (const cell of new Set(pathCells(run.path, resolution))) cells.push(cellFeature(cell, { color }));
  }
  return { lines: featureCollection(lines), cells: featureCollection(cells) };
}

export function tradeRouteFeatures(
  routes: readonly TradeRoute[],
  resolution: number,
): { lines: LabFeatureCollection; cells: LabFeatureCollection } {
  const lines: LabFeature[] = [];
  const cells: LabFeature[] = [];
  for (const route of routes) {
    const properties = { bandwidth: route.bandwidth, share: route.bandwidthShare };
    lines.push({ type: "Feature", geometry: { type: "LineString", coordinates: route.path }, properties });
    for (const cell of new Set(pathCells(route.path, resolution))) cells.push(cellFeature(cell, properties));
  }
  return { lines: featureCollection(lines), cells: featureCollection(cells) };
}

export function gridFeatures(bounds: Bounds, resolution: number, maxCells: number): LabFeatureCollection | undefined {
  if (estimatedCellCount(bounds, resolution) > maxCells) return undefined;
  const [west, south, east, north] = bounds;
  const ring: LngLat[] = [
    [west, south],
    [east, south],
    [east, north],
    [west, north],
    [west, south],
  ];
  const cells = polygonToCells([ring], resolution, true);
  return featureCollection(
    cells.map((cell) => ({
      type: "Feature",
      geometry: { type: "LineString", coordinates: cellToBoundary(cell, true) as LngLat[] },
      properties: {},
    })),
  );
}

export function estimatedCellCount([west, south, east, north]: Bounds, resolution: number): number {
  const middleLatitude = ((south + north) / 2) * DEGREES_TO_RADIANS;
  const widthKm = (east - west) * KILOMETERS_PER_DEGREE_LATITUDE * Math.cos(middleLatitude);
  const heightKm = (north - south) * KILOMETERS_PER_DEGREE_LATITUDE;
  return (widthKm * heightKm) / getHexagonAreaAvg(resolution, "km2");
}

function connectingCells(from: string, to: string): string[] {
  try {
    return gridPathCells(from, to).slice(1);
  } catch {
    return [to];
  }
}

function strongestPlayer(scores: ReadonlyMap<number, number>): number {
  let best = -1;
  let bestScore = -Infinity;
  for (const [playerId, score] of scores) {
    if (score > bestScore || (score === bestScore && playerId < best)) {
      best = playerId;
      bestScore = score;
    }
  }
  return best;
}

function cellFeature(cell: string, properties: Record<string, string | number>): LabFeature {
  return {
    type: "Feature",
    geometry: { type: "Polygon", coordinates: [cellToBoundary(cell, true) as LngLat[]] },
    properties,
  };
}
