import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";
import { buildLayers, layersBoundingBox, parseOsm, type Feature } from "../src/index.ts";

const fixture = await readFile(new URL("./fixtures/small-town.osm", import.meta.url), "utf8");
const layers = buildLayers(await parseOsm([fixture]));

function featureById(features: readonly Feature[], id: string): Feature | undefined {
  return features.find((feature) => feature.id === id);
}

describe("buildLayers", () => {
  it("puts a tagged road into the roads layer with its kind and name", () => {
    const road = featureById(layers.roads.features, "w100");

    assert.equal(road?.geometry.type, "LineString");
    assert.deepEqual(road?.properties, { kind: "primary", name: "třída Tomáše Bati" });
  });

  it("turns a closed building way into a polygon", () => {
    const building = featureById(layers.buildings.features, "w101");

    assert.equal(building?.geometry.type, "Polygon");
    assert.equal(building?.properties.kind, "yes");
  });

  it("keeps a closed roundabout as a line, not an area", () => {
    const roundabout = featureById(layers.roads.features, "w105");

    assert.equal(roundabout?.geometry.type, "LineString");
  });

  it("skips ways that reference nodes missing from the file", () => {
    assert.equal(featureById(layers.roads.features, "w106"), undefined);
  });

  it("ignores untagged ways", () => {
    const allIds = Object.values(layers).flatMap((layer) => layer.features.map((feature) => feature.id));

    assert.equal(allIds.includes("w102"), false);
    assert.equal(allIds.includes("w104"), false);
  });

  it("assembles a multipolygon relation with a hole from split outer ways", () => {
    const forest = featureById(layers.landcover.features, "r200");

    assert.equal(forest?.geometry.type, "MultiPolygon");
    assert.equal(forest?.properties.kind, "forest");
    const [polygon] = forest?.geometry.type === "MultiPolygon" ? forest.geometry.coordinates : [];
    assert.equal(polygon?.length, 2);
    assert.equal(polygon?.[0]?.length, 5);
  });

  it("draws administrative boundaries as lines with the admin level as kind", () => {
    const boundary = featureById(layers.boundaries.features, "r300");

    assert.equal(boundary?.geometry.type, "MultiLineString");
    assert.deepEqual(boundary?.properties, { kind: "8", name: "Zlín" });
  });

  it("computes the bounding box of everything drawn", () => {
    assert.deepEqual(layersBoundingBox(layers), [17.655, 49.22, 17.675, 49.23]);
  });
});
