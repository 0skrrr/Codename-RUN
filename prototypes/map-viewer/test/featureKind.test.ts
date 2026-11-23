import assert from "node:assert/strict";
import { describe, it } from "node:test";
import cs from "../../../locales/cs.json" with { type: "json" };
import en from "../../../locales/en.json" with { type: "json" };
import { kindLabel, TRANSLATED_KINDS } from "../src/featureKind.ts";

const locales: Record<string, Record<string, string>> = { en, cs };

describe("kindLabel", () => {
  it("uses the translated text for a known kind", () => {
    assert.deepEqual(kindLabel("buildings", "yes"), { kind: "message", key: "mapViewer.kind.buildings.yes" });
  });

  it("keeps the same tag value apart per layer", () => {
    assert.notDeepEqual(kindLabel("roads", "residential"), kindLabel("landcover", "residential"));
  });

  it("shows an unknown tag value readably instead of as a raw identifier", () => {
    assert.deepEqual(kindLabel("roads", "busway_link"), { kind: "raw", text: "busway link" });
  });

  it("describes a boundary by its administrative level", () => {
    assert.deepEqual(kindLabel("boundaries", "8"), {
      kind: "message",
      key: "mapViewer.kind.boundaryLevel",
      values: { level: "8" },
    });
  });

  for (const [language, messages] of Object.entries(locales)) {
    it(`has text for every translated kind in ${language}`, () => {
      const missing = Object.entries(TRANSLATED_KINDS)
        .flatMap(([layer, kinds]) => kinds.map((kind) => `mapViewer.kind.${layer}.${kind}`))
        .filter((key) => typeof messages[key] !== "string");

      assert.deepEqual(missing, []);
    });
  }
});
