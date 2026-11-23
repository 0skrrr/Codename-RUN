import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { areNeighborCells, cellToChildren, cellToLatLng, cellToParent, gridDisk, latLngToCell } from "h3-js";
import type { LngLat } from "../src/lab/geo.ts";
import {
  aggregateOwnership,
  displayResolution,
  fillTerritory,
  playAreaCells,
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

  it("with the majority rule, colours a hex only when one player owns over half its area", () => {
    const over = new Map(children.slice(0, 26).map((cell) => [cell, 0]));
    const exactlyHalfOrLess = new Map(children.slice(0, 24).map((cell) => [cell, 0]));

    assert.equal(children.length, 49);
    assert.equal(aggregateOwnership(over, coarse, 0, "majorityOfArea").get(parent)?.playerId, 0);
    assert.equal(aggregateOwnership(exactlyHalfOrLess, coarse, 0, "majorityOfArea").size, 0);
    assert.equal(aggregateOwnership(exactlyHalfOrLess, coarse, 0, "mostOfClaimed").size, 1);
  });

  it("with the mostly-claimed rule, gives a hex over half claimed to the biggest owner", () => {
    const mixed = new Map(children.slice(0, 30).map((cell, index) => [cell, index < 15 ? 0 : index < 25 ? 1 : 2]));
    const sparse = new Map(children.slice(0, 20).map((cell) => [cell, 0]));

    assert.equal(aggregateOwnership(mixed, coarse, 0, "leaderOfMostlyClaimed").get(parent)?.playerId, 0);
    assert.equal(aggregateOwnership(mixed, coarse, 0, "majorityOfArea").size, 0);
    assert.equal(aggregateOwnership(sparse, coarse, 0, "leaderOfMostlyClaimed").size, 0);
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

describe("fillTerritory", () => {
  const center: LngLat = [17.67, 49.22];
  const radius = 1_000;
  const resolution = 10;
  const area = playAreaCells(center, radius, resolution);
  const seeds = new Map([
    [latLngToCell(49.22, 17.665, resolution), 0],
    [latLngToCell(49.22, 17.675, resolution), 1],
  ]);

  it("grows territories until the requested share of the play area is claimed", () => {
    const filled = fillTerritory(seeds, center, radius, 0.5, resolution);
    const claimedInArea = area.filter((cell) => filled.has(cell)).length;

    assert.ok(claimedInArea >= area.length * 0.5);
    assert.ok(claimedInArea <= area.length * 0.5 + 1);
  });

  it("splits the grown land between the players", () => {
    const filled = fillTerritory(seeds, center, radius, 1, resolution);
    const owners = [...filled.values()];

    assert.equal(filled.size, area.length);
    assert.ok(owners.filter((id) => id === 0).length > area.length / 4);
    assert.ok(owners.filter((id) => id === 1).length > area.length / 4);
  });

  it("changes nothing at 0%", () => {
    assert.deepEqual(fillTerritory(seeds, center, radius, 0, resolution), seeds);
  });
});

describe("fillTerritory with tiny hexes", () => {
  it("keeps grown land on a coarser grid instead of creating hundreds of thousands of hexes", () => {
    const center: LngLat = [17.67, 49.22];
    const seed = new Map([[latLngToCell(49.22, 17.67, 13), 0]]);
    const filled = fillTerritory(seed, center, 3_000, 1, 13);

    assert.ok(filled.size < 200_000);
    assert.ok(filled.size > 1_000);
  });

  it("counts coarse hexes by their area when simplifying", () => {
    const fine = latLngToCell(49.22, 17.67, 11);
    const coarseNeighbourParent = cellToParent(fine, 10);
    const owners = new Map([
      [fine, 0],
      [coarseNeighbourParent, 1],
    ]);
    const aggregated = aggregateOwnership(owners, 9, 0);

    assert.equal([...aggregated.values()][0]?.playerId, 1);
  });
});
