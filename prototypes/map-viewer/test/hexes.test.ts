import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { areNeighborCells, cellToLatLng, getHexagonEdgeLengthAvg, gridDisk, latLngToCell } from "h3-js";
import type { LngLat } from "../src/lab/geo.ts";
import {
  estimatedCellCount,
  gridFeatures,
  hexFadeZooms,
  pathCells,
  territoryOwnership,
  territorySizes,
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

describe("hexFadeZooms", () => {
  it("brings hexes in later for smaller hex sizes", () => {
    const big = hexFadeZooms(9, 49.2, 10);
    const small = hexFadeZooms(11, 49.2, 10);

    assert.ok(small.start > big.start);
  });

  it("starts the fade where a hex edge is the requested number of pixels on screen", () => {
    const { start } = hexFadeZooms(11, 49.2, 10);
    const metersPerPixel = (40_075_016.686 * Math.cos((49.2 * Math.PI) / 180)) / (512 * 2 ** start);

    assert.ok(Math.abs(getHexagonEdgeLengthAvg(11, "m") / metersPerPixel - 10) < 1e-6);
  });

  it("finishes the fade a little closer in than it starts", () => {
    const { start, end } = hexFadeZooms(11, 49.2, 10);

    assert.ok(end > start && end - start < 1);
  });
});

describe("territorySizes", () => {
  const players = [
    { id: 0, color: "#ff0000", heightFactor: 1 },
    { id: 1, color: "#00ff00", heightFactor: 1 },
  ];

  it("counts the hexes each player owns, including players who own none", () => {
    const owners = new Map([
      ["a", 0],
      ["b", 0],
    ]);

    assert.deepEqual(territorySizes(owners, players), [
      { playerId: 0, color: "#ff0000", hexes: 2 },
      { playerId: 1, color: "#00ff00", hexes: 0 },
    ]);
  });
});
