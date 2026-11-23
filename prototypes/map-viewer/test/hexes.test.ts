import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { areNeighborCells, cellToChildren, cellToLatLng, gridDisk, latLngToCell } from "h3-js";
import type { LngLat } from "../src/lab/geo.ts";
import {
  aggregateOwnership,
  displayResolution,
  estimatedCellCount,
  gridFeatures,
  pathCells,
  territoryOwnership,
} from "../src/lab/hexes.ts";

const RESOLUTION = 11;
const LINE: LngLat[] = [
  [17.66, 49.22],
  [17.68, 49.22],
];

describe("pathCells", () => {
  it("returns a gap-free chain of neighbouring hexes even between far-apart points", () => {
    const cells = pathCells(LINE, RESOLUTION);

    assert.ok(cells.length > 10);
    for (let index = 1; index < cells.length; index++) {
      assert.ok(areNeighborCells(cells[index - 1]!, cells[index]!));
    }
  });
});

describe("territoryOwnership", () => {
  it("grows territory around the run by the requested number of rings", () => {
    const narrow = territoryOwnership([{ playerId: 0, path: LINE }], RESOLUTION, 0);
    const wide = territoryOwnership([{ playerId: 0, path: LINE }], RESOLUTION, 2);

    assert.ok(wide.size > narrow.size * 3);
  });

  it("gives a contested hex to the player who ran through it more", () => {
    const owners = territoryOwnership(
      [
        { playerId: 0, path: LINE },
        { playerId: 1, path: LINE },
        { playerId: 1, path: LINE },
      ],
      RESOLUTION,
      0,
    );

    assert.ok([...owners.values()].every((playerId) => playerId === 1));
  });

  it("lets a runner's own path beat a neighbour's grown border", () => {
    const first = latLngToCell(49.22, 17.66, RESOLUTION);
    const second = gridDisk(first, 1).find((cell) => cell !== first)!;
    const [secondLatitude, secondLongitude] = cellToLatLng(second);
    const owners = territoryOwnership(
      [
        { playerId: 0, path: [[17.66, 49.22]] },
        { playerId: 1, path: [[secondLongitude, secondLatitude]] },
      ],
      RESOLUTION,
      1,
    );

    assert.equal(owners.get(first), 0);
    assert.equal(owners.get(second), 1);
  });
});

describe("gridFeatures", () => {
  const bounds: [number, number, number, number] = [17.66, 49.22, 17.67, 49.225];

  it("draws one outline per hex in view", () => {
    const grid = gridFeatures(bounds, 9, 10_000);

    assert.ok(grid && grid.features.length > 0);
  });

  it("refuses to draw when there would be too many hexes", () => {
    assert.ok(estimatedCellCount(bounds, 13) > 100);
    assert.equal(gridFeatures(bounds, 13, 100), undefined);
  });
});

describe("aggregateOwnership", () => {
  const fine = 11;
  const coarse = 9;
  const parent = latLngToCell(49.22, 17.66, coarse);
  const children = cellToChildren(parent, fine);

  it("gives a coarse hex the colour of the player owning most of it", () => {
    const owners = new Map(children.map((cell, index) => [cell, index < 30 ? 0 : 1]));
    const aggregated = aggregateOwnership(owners, coarse, 0);

    assert.deepEqual([...aggregated.keys()], [parent]);
    assert.equal(aggregated.get(parent)?.playerId, 0);
    assert.ok(Math.abs((aggregated.get(parent)?.share ?? 0) - 30 / children.length) < 1e-9);
  });

  it("leaves a coarse hex empty when nobody dominates enough", () => {
    const owners = new Map(children.map((cell, index) => [cell, index % 2]));

    assert.equal(aggregateOwnership(owners, coarse, 0.6).size, 0);
  });
});

describe("displayResolution", () => {
  it("keeps the chosen size when hexes are big enough on screen", () => {
    assert.equal(displayResolution(11, 17, 49.2, 14), 11);
  });

  it("switches to coarser hexes as you zoom out", () => {
    const close = displayResolution(11, 14, 49.2, 14);
    const far = displayResolution(11, 10, 49.2, 14);

    assert.ok(close < 11);
    assert.ok(far < close);
  });

  it("never returns a size finer than the chosen one", () => {
    assert.equal(displayResolution(8, 19, 49.2, 4), 8);
  });
});
