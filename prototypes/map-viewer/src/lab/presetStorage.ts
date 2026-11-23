import { isValidPresetName, PRESET_FORMAT_VERSION, PRESETS_API_PATH } from "./presetFormat.ts";
import { sanitizeSettings, type Settings } from "./settings.ts";

const LAST_USED_STORAGE_KEY = "codename-run.map-lab.settings";

export function loadLastUsedSettings(): Settings {
  try {
    const stored = window.localStorage.getItem(LAST_USED_STORAGE_KEY);
    return sanitizeSettings(stored === null ? undefined : JSON.parse(stored));
  } catch {
    return sanitizeSettings(undefined);
  }
}

export function saveLastUsedSettings(settings: Settings): void {
  try {
    window.localStorage.setItem(LAST_USED_STORAGE_KEY, JSON.stringify(settings));
  } catch {
    return;
  }
}

export async function listSharedPresets(): Promise<string[] | undefined> {
  try {
    const response = await fetch(PRESETS_API_PATH);
    if (!response.ok) return undefined;
    const body = (await response.json()) as { presets?: unknown };
    return Array.isArray(body.presets) ? body.presets.filter((name): name is string => typeof name === "string") : undefined;
  } catch {
    return undefined;
  }
}

export async function loadSharedPreset(name: string): Promise<Settings | undefined> {
  if (!isValidPresetName(name)) return undefined;
  const response = await fetch(`${PRESETS_API_PATH}/${name}`);
  if (!response.ok) return undefined;
  const body = (await response.json()) as { settings?: unknown };
  return sanitizeSettings(body.settings);
}

export async function saveSharedPreset(name: string, settings: Settings): Promise<boolean> {
  if (!isValidPresetName(name)) return false;
  const response = await fetch(`${PRESETS_API_PATH}/${name}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ settings }),
  });
  return response.ok;
}

export async function deleteSharedPreset(name: string): Promise<boolean> {
  if (!isValidPresetName(name)) return false;
  const response = await fetch(`${PRESETS_API_PATH}/${name}`, { method: "DELETE" });
  return response.ok;
}

export function exportSettingsFile(settings: Settings, fileName: string): void {
  const body = JSON.stringify({ version: PRESET_FORMAT_VERSION, settings }, null, 2);
  const url = URL.createObjectURL(new Blob([body], { type: "application/json" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `${fileName}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

export async function importSettingsFile(file: File): Promise<Settings | undefined> {
  try {
    const parsed = JSON.parse(await file.text()) as { settings?: unknown };
    return sanitizeSettings(parsed.settings);
  } catch {
    return undefined;
  }
}
