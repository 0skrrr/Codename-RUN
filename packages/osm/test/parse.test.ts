import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";
import { parseOsm } from "../src/index.ts";

const fixture = await readFile(new URL("./fixtures/small-town.osm", import.meta.url), "utf8");

function* inChunksOf(text: string, size: number): Generator<string> {
  for (let start = 0; start < text.length; start += size) yield text.slice(start, start + size);
}

describe("parseOsm", () => {
  it("reads nodes, ways and relations with their tags", async () => {
    const data = await parseOsm([fixture]);

    assert.equal(data.nodes.size, 15);
    assert.equal(data.ways.size, 7);
    assert.equal(data.relations.size, 2);
    assert.deepEqual(data.nodes.get(1), { id: 1, lat: 49.22, lon: 17.66, tags: {} });
    assert.equal(data.nodes.get(22)?.tags.place, "village");
    assert.deepEqual(data.ways.get(100)?.nodeIds, [20, 21]);
    assert.equal(data.ways.get(100)?.tags.name, "třída Tomáše Bati");
    assert.deepEqual(data.relations.get(200)?.members[2], { type: "way", ref: 104, role: "inner" });
  });

  it("gives the same result when tags are split across chunks", async () => {
    const whole = await parseOsm([fixture]);
    const chunked = await parseOsm(inChunksOf(fixture, 7));

    assert.deepEqual(chunked, whole);
  });

  it("rejects malformed XML", async () => {
    await assert.rejects(parseOsm(['<osm><node id="1" lat="1" lon="1"></way></osm>']));
  });
});
