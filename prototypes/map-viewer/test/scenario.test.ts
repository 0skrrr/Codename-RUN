import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { cumulativeDistances, distanceMeters, pointAlongPath, type LngLat } from "../src/lab/geo.ts";
import { seededRandom } from "../src/lab/random.ts";
import { buildRoadGraph, randomWalk } from "../src/lab/roadGraph.ts";
import { generateScenario } from "../src/lab/scenario.ts";

const CENTER: LngLat = [17.6667, 49.2265];
const STEP = 0.001;

function gridStreets(size: number): LngLat[][] {
  const lines: LngLat[][] = [];
  for (let row = 0; row < size; row++) {
    const horizontal: LngLat[] = [];
    const vertical: LngLat[] = [];
    for (let column = 0; column < size; column++) {
      horizontal.push([CENTER[0] + column * STEP, CENTER[1] + row * STEP]);
      vertical.push([CENTER[0] + row * STEP, CENTER[1] + column * STEP]);
    }
    lines.push(horizontal, vertical);
  }
  return lines;
}

const graph = buildRoadGraph(gridStreets(10), CENTER, 5_000);

describe("geo helpers", () => {
  it("measures about 111 m per 0.001° of latitude", () => {
    assert.ok(Math.abs(distanceMeters([17, 49], [17, 49.001]) - 111.2) < 0.5);
  });

  it("finds the midpoint along a path", () => {
    const path: LngLat[] = [
      [0, 0],
      [0, 1],
    ];
    const [, latitude] = pointAlongPath(path, cumulativeDistances(path), cumulativeDistances(path)[1]! / 2);

    assert.ok(Math.abs(latitude - 0.5) < 1e-9);
  });
});

describe("buildRoadGraph", () => {
  it("joins streets that share a point into one network", () => {
    assert.equal(graph.positions.length, 100);
    assert.equal(Math.max(...graph.neighbors.map((list) => list.length)), 4);
  });

  it("leaves out streets outside the radius", () => {
    assert.equal(buildRoadGraph(gridStreets(10), [0, 0], 1_000).positions.length, 0);
  });
});

describe("randomWalk", () => {
  it("walks at least the requested distance along the streets", () => {
    const path = randomWalk(graph, 0, 2_000, seededRandom(1));
    const walked = cumulativeDistances(path).at(-1) ?? 0;

    assert.ok(walked >= 2_000);
    assert.ok(path.every((point) => graph.positions.includes(point)));
  });
});

describe("generateScenario", () => {
  const options = { seed: 5, players: 3, runsPerPlayer: 2, runLengthMeters: 1_000, tradeRoutes: 2 };

  it("is the same every time for the same seed", () => {
    assert.deepEqual(generateScenario(graph, options), generateScenario(graph, options));
  });

  it("creates the requested players, runs and trade routes", () => {
    const scenario = generateScenario(graph, options);

    assert.equal(scenario.players.length, 3);
    assert.equal(scenario.runs.length, 6);
    assert.equal(scenario.tradeRoutes.length, 2);
    for (const route of scenario.tradeRoutes) {
      assert.ok(route.bandwidth >= 10 && route.bandwidth <= 1_000);
      assert.ok(route.bandwidthShare >= 0 && route.bandwidthShare <= 1);
    }
  });
});
