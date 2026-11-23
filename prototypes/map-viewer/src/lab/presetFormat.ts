export const PRESETS_API_PATH = "/api/presets";
export const PRESET_FORMAT_VERSION = 1;

const PRESET_NAME_PATTERN = /^[a-z0-9][a-z0-9-]{0,39}$/;

export function isValidPresetName(name: string): boolean {
  return PRESET_NAME_PATTERN.test(name);
}

export function toPresetName(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}
