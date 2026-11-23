import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isClosedPath, joinIntoRings } from "../src/index.ts";

describe("isClosedPath", () => {
  it("is true only when the path returns to its start with at least a triangle", () => {
    assert.equal(isClosedPath([1, 2, 3, 1]), true);
    assert.equal(isClosedPath([1, 2, 1]), false);
    assert.equal(isClosedPath([1, 2, 3]), false);
  });
});

describe("joinIntoRings", () => {
  it("keeps an already closed path as one ring", () => {
    assert.deepEqual(joinIntoRings([[1, 2, 3, 1]]), [[1, 2, 3, 1]]);
  });

  it("joins segments that point in opposite directions", () => {
    const rings = joinIntoRings([
      [1, 2, 3],
      [1, 4, 3],
    ]);

    assert.equal(rings.length, 1);
    assert.equal(isClosedPath(rings[0] ?? []), true);
    assert.deepEqual(new Set(rings[0]), new Set([1, 2, 3, 4]));
  });

  it("joins segments given out of order", () => {
    const rings = joinIntoRings([
      [3, 4],
      [1, 2],
      [4, 1],
      [2, 3],
    ]);

    assert.equal(rings.length, 1);
    assert.equal(rings[0]?.length, 5);
  });

  it("drops segments that cannot be closed", () => {
    assert.deepEqual(joinIntoRings([[1, 2, 3], [3, 4]]), []);
  });

  it("returns separate rings for separate shapes", () => {
    assert.equal(joinIntoRings([[1, 2, 3, 1], [5, 6, 7, 5]]).length, 2);
  });
});
