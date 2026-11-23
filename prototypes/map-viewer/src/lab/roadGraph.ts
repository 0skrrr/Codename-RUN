import { distanceMeters, type LngLat } from "./geo.ts";
import { pickIndex, type Random } from "./random.ts";

export interface RoadGraph {
  readonly positions: readonly LngLat[];
  readonly neighbors: readonly (readonly number[])[];
}

const MIN_INTERSECTION_DEGREE = 3;
const MAX_WALK_STEPS = 50_000;

export function buildRoadGraph(lines: readonly (readonly LngLat[])[], center: LngLat, radiusMeters: number): RoadGraph {
  const indexByKey = new Map<string, number>();
  const positions: LngLat[] = [];
  const neighbors: number[][] = [];

  const indexOf = (position: LngLat): number => {
    const key = `${position[0]},${position[1]}`;
    const existing = indexByKey.get(key);
    if (existing !== undefined) return existing;
    indexByKey.set(key, positions.length);
    positions.push(position);
    neighbors.push([]);
    return positions.length - 1;
  };

  for (const line of lines) {
    for (let index = 1; index < line.length; index++) {
      const from = line[index - 1] as LngLat;
      const to = line[index] as LngLat;
      if (distanceMeters(from, center) > radiusMeters || distanceMeters(to, center) > radiusMeters) continue;
      const a = indexOf(from);
      const b = indexOf(to);
      if (a === b) continue;
      neighbors[a]?.push(b);
      neighbors[b]?.push(a);
    }
  }

  return { positions, neighbors };
}

export function pickStartVertex(graph: RoadGraph, random: Random): number | undefined {
  const intersections = graph.neighbors
    .map((list, index) => (list.length >= MIN_INTERSECTION_DEGREE ? index : -1))
    .filter((index) => index >= 0);
  const pool = intersections.length > 0 ? intersections : graph.positions.map((_, index) => index);
  if (pool.length === 0) return undefined;
  return pool[pickIndex(random, pool.length)];
}

export function randomWalk(graph: RoadGraph, start: number, targetMeters: number, random: Random): LngLat[] {
  const path: LngLat[] = [graph.positions[start] as LngLat];
  let previous = -1;
  let current = start;
  let walked = 0;

  for (let step = 0; step < MAX_WALK_STEPS && walked < targetMeters; step++) {
    const all = graph.neighbors[current] ?? [];
    const forward = all.filter((candidate) => candidate !== previous);
    const options = forward.length > 0 ? forward : all;
    if (options.length === 0) break;
    const next = options[pickIndex(random, options.length)] as number;
    walked += distanceMeters(graph.positions[current] as LngLat, graph.positions[next] as LngLat);
    path.push(graph.positions[next] as LngLat);
    previous = current;
    current = next;
  }

  return path;
}
