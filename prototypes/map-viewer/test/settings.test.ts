import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { CONTROL_GROUPS, DEFAULT_SETTINGS, sanitizeSettings } from "../src/lab/settings.ts";

describe("sanitizeSettings", () => {
  it("returns the defaults for anything that is not an object", () => {
    assert.deepEqual(sanitizeSettings(null), DEFAULT_SETTINGS);
    assert.deepEqual(sanitizeSettings("hello"), DEFAULT_SETTINGS);
  });

  it("keeps valid values and fills missing ones from the defaults", () => {
    const settings = sanitizeSettings({ "hexGrid.resolution": 9, "view.mode": "extruded" });

    assert.equal(settings["hexGrid.resolution"], 9);
    assert.equal(settings["view.mode"], "extruded");
    assert.equal(settings["runs.enabled"], DEFAULT_SETTINGS["runs.enabled"]);
  });

  it("rejects values of the wrong type, out of range, or not in the option list", () => {
    const settings = sanitizeSettings({
      "hexGrid.resolution": 42,
      "hexGrid.enabled": "yes",
      "territory.style": "sparkles",
      "hexGrid.lineColor": "red; background: url(x)",
      "scenario.centerLatitude": 120,
    });

    assert.equal(settings["hexGrid.resolution"], DEFAULT_SETTINGS["hexGrid.resolution"]);
    assert.equal(settings["hexGrid.enabled"], DEFAULT_SETTINGS["hexGrid.enabled"]);
    assert.equal(settings["territory.style"], DEFAULT_SETTINGS["territory.style"]);
    assert.equal(settings["hexGrid.lineColor"], DEFAULT_SETTINGS["hexGrid.lineColor"]);
    assert.equal(settings["scenario.centerLatitude"], DEFAULT_SETTINGS["scenario.centerLatitude"]);
  });

  it("drops keys it does not know", () => {
    const settings = sanitizeSettings({ "admin.password": "x" }) as unknown as Record<string, unknown>;

    assert.equal("admin.password" in settings, false);
  });

  it("has defaults that pass their own validation", () => {
    assert.deepEqual(sanitizeSettings(DEFAULT_SETTINGS), DEFAULT_SETTINGS);
  });

  it("exposes every visible setting in exactly one control", () => {
    const keys = CONTROL_GROUPS.flatMap((group) => group.controls.map((control) => control.key));

    assert.equal(new Set(keys).size, keys.length);
  });
});
