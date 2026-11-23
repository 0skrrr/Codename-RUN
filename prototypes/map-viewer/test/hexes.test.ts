import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { areNeighborCells, cellToLatLng, gridDisk, latLngToCell } from "h3-js";
import type { LngLat } from "../src/lab/geo.ts";
import { estimatedCellCount, gridFeatures, pathCells, territoryOwnership } from "../src/lab/hexes.ts";

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
