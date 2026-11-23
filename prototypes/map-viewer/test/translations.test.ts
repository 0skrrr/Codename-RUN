import assert from "node:assert/strict";
import { describe, it } from "node:test";
import cs from "../../../locales/cs.json" with { type: "json" };
import en from "../../../locales/en.json" with { type: "json" };
import { CONTROL_GROUPS } from "../src/lab/settings.ts";

const locales: Record<string, Record<string, string>> = { en, cs };

function requiredKeys(): string[] {
  const keys = ["lab.group.presets"];
  for (const group of CONTROL_GROUPS) {
    keys.push(`lab.group.${group.id}`);
    for (const control of group.controls) {
      keys.push(`lab.control.${control.key}`);
      if (control.kind === "choice") keys.push(...control.options.map((option) => `lab.option.${option}`));
    }
  }
  return keys;
}

describe("lab translations", () => {
  for (const [language, messages] of Object.entries(locales)) {
    it(`has text for every setting, group and option in ${language}`, () => {
      const missing = requiredKeys().filter((key) => typeof messages[key] !== "string");

      assert.deepEqual(missing, []);
    });
  }

  it("has the same keys in every language", () => {
    assert.deepEqual(Object.keys(cs).sort(), Object.keys(en).sort());
  });
});
