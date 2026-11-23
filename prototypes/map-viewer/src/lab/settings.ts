export const VIEW_MODES = ["flat", "extruded"] as const;
export const TERRITORY_STYLES = ["fill", "outline", "fillOutline"] as const;
export const TERRITORY_BORDERS = ["perHex", "merged"] as const;
export const RUN_STYLES = ["line", "hexes", "both"] as const;
export const SIMPLIFY_RULES = ["mostOfClaimed", "majorityOfArea", "leaderOfMostlyClaimed"] as const;
export const TRADE_STYLES = ["line", "hexChain", "both"] as const;
export const TRADE_WIDTH_MODES = ["fixed", "bandwidth"] as const;
export const TRADE_COLOR_MODES = ["fixed", "bandwidth"] as const;

export interface Settings {
  "view.mode": (typeof VIEW_MODES)[number];
  "view.pitch": number;
  "baseMap.opacity": number;
  "baseMap.extrudeBuildings": boolean;
  "baseMap.buildingHeight": number;
  "hexGrid.enabled": boolean;
  "hexGrid.resolution": number;
  "hexGrid.lineColor": string;
  "hexGrid.lineWidth": number;
  "hexGrid.lineOpacity": number;
  "territory.enabled": boolean;
  "territory.style": (typeof TERRITORY_STYLES)[number];
  "territory.border": (typeof TERRITORY_BORDERS)[number];
  "territory.fillOpacity": number;
  "territory.outlineWidth": number;
  "territory.growth": number;
  "territory.height": number;
  "territory.heightByPlayer": boolean;
  "simplify.enabled": boolean;
  "simplify.minHexPixels": number;
  "simplify.rule": (typeof SIMPLIFY_RULES)[number];
  "simplify.minShare": number;
  "simplify.fadeByShare": boolean;
  "simplify.gridFollows": boolean;
  "runs.enabled": boolean;
  "runs.style": (typeof RUN_STYLES)[number];
  "runs.lineWidth": number;
  "runs.opacity": number;
  "runs.dashed": boolean;
  "tradeRoutes.enabled": boolean;
  "tradeRoutes.style": (typeof TRADE_STYLES)[number];
  "tradeRoutes.widthMode": (typeof TRADE_WIDTH_MODES)[number];
  "tradeRoutes.minWidth": number;
  "tradeRoutes.maxWidth": number;
  "tradeRoutes.colorMode": (typeof TRADE_COLOR_MODES)[number];
  "tradeRoutes.color": string;
  "tradeRoutes.lowBandwidthColor": string;
  "tradeRoutes.highBandwidthColor": string;
  "tradeRoutes.maxHeight": number;
  "tradeRoutes.packets": boolean;
  "tradeRoutes.packetSpeed": number;
  "tradeRoutes.packetSize": number;
  "scenario.seed": number;
  "scenario.players": number;
  "scenario.runsPerPlayer": number;
  "scenario.runLengthKm": number;
  "scenario.tradeRoutes": number;
  "scenario.areaKm": number;
  "scenario.fillPercent": number;
  "scenario.centerLongitude": number;
  "scenario.centerLatitude": number;
}

export type SettingKey = keyof Settings;

export type Control =
  | { key: SettingKey; kind: "toggle" }
  | { key: SettingKey; kind: "range"; min: number; max: number; step: number; unit?: string }
  | { key: SettingKey; kind: "color" }
  | { key: SettingKey; kind: "choice"; options: readonly string[] };

export interface ControlGroup {
  id: string;
  controls: readonly Control[];
}

export const ZLIN_CITY_CENTER = { longitude: 17.6667, latitude: 49.2265 } as const;

export const DEFAULT_SETTINGS: Readonly<Settings> = {
  "view.mode": "flat",
  "view.pitch": 0,
  "baseMap.opacity": 1,
  "baseMap.extrudeBuildings": false,
  "baseMap.buildingHeight": 12,
  "hexGrid.enabled": true,
  "hexGrid.resolution": 11,
  "hexGrid.lineColor": "#5b5b5b",
  "hexGrid.lineWidth": 0.6,
  "hexGrid.lineOpacity": 0.35,
  "territory.enabled": true,
  "territory.style": "fillOutline",
  "territory.border": "merged",
  "territory.fillOpacity": 0.45,
  "territory.outlineWidth": 2,
  "territory.growth": 1,
  "territory.height": 30,
  "territory.heightByPlayer": false,
  "simplify.enabled": true,
  "simplify.minHexPixels": 14,
  "simplify.rule": "mostOfClaimed",
  "simplify.minShare": 0,
  "simplify.fadeByShare": true,
  "simplify.gridFollows": true,
  "runs.enabled": true,
  "runs.style": "line",
  "runs.lineWidth": 3,
  "runs.opacity": 0.9,
  "runs.dashed": false,
  "tradeRoutes.enabled": true,
  "tradeRoutes.style": "line",
  "tradeRoutes.widthMode": "bandwidth",
  "tradeRoutes.minWidth": 2,
  "tradeRoutes.maxWidth": 12,
  "tradeRoutes.colorMode": "bandwidth",
  "tradeRoutes.color": "#2b2d42",
  "tradeRoutes.lowBandwidthColor": "#8ecae6",
  "tradeRoutes.highBandwidthColor": "#d62828",
  "tradeRoutes.maxHeight": 80,
  "tradeRoutes.packets": true,
  "tradeRoutes.packetSpeed": 1,
  "tradeRoutes.packetSize": 4,
  "scenario.seed": 7,
  "scenario.players": 4,
  "scenario.runsPerPlayer": 4,
  "scenario.runLengthKm": 5,
  "scenario.tradeRoutes": 3,
  "scenario.areaKm": 3,
  "scenario.fillPercent": 0,
  "scenario.centerLongitude": ZLIN_CITY_CENTER.longitude,
  "scenario.centerLatitude": ZLIN_CITY_CENTER.latitude,
};

export const CONTROL_GROUPS: readonly ControlGroup[] = [
  {
    id: "view",
    controls: [
      { key: "view.mode", kind: "choice", options: VIEW_MODES },
      { key: "view.pitch", kind: "range", min: 0, max: 70, step: 1, unit: "°" },
    ],
  },
  {
    id: "baseMap",
    controls: [
      { key: "baseMap.opacity", kind: "range", min: 0, max: 1, step: 0.05 },
      { key: "baseMap.extrudeBuildings", kind: "toggle" },
      { key: "baseMap.buildingHeight", kind: "range", min: 2, max: 60, step: 1, unit: "m" },
    ],
  },
  {
    id: "hexGrid",
    controls: [
      { key: "hexGrid.enabled", kind: "toggle" },
      { key: "hexGrid.resolution", kind: "range", min: 7, max: 13, step: 1 },
      { key: "hexGrid.lineColor", kind: "color" },
      { key: "hexGrid.lineWidth", kind: "range", min: 0.2, max: 4, step: 0.1, unit: "px" },
      { key: "hexGrid.lineOpacity", kind: "range", min: 0, max: 1, step: 0.05 },
    ],
  },
  {
    id: "territory",
    controls: [
      { key: "territory.enabled", kind: "toggle" },
      { key: "territory.style", kind: "choice", options: TERRITORY_STYLES },
      { key: "territory.border", kind: "choice", options: TERRITORY_BORDERS },
      { key: "territory.fillOpacity", kind: "range", min: 0, max: 1, step: 0.05 },
      { key: "territory.outlineWidth", kind: "range", min: 0, max: 8, step: 0.5, unit: "px" },
      { key: "territory.growth", kind: "range", min: 0, max: 4, step: 1 },
      { key: "territory.height", kind: "range", min: 0, max: 300, step: 5, unit: "m" },
      { key: "territory.heightByPlayer", kind: "toggle" },
    ],
  },
  {
    id: "simplify",
    controls: [
      { key: "simplify.enabled", kind: "toggle" },
      { key: "simplify.minHexPixels", kind: "range", min: 4, max: 60, step: 1, unit: "px" },
      { key: "simplify.rule", kind: "choice", options: SIMPLIFY_RULES },
      { key: "simplify.minShare", kind: "range", min: 0, max: 0.9, step: 0.05 },
      { key: "simplify.fadeByShare", kind: "toggle" },
      { key: "simplify.gridFollows", kind: "toggle" },
    ],
  },
  {
    id: "runs",
    controls: [
      { key: "runs.enabled", kind: "toggle" },
      { key: "runs.style", kind: "choice", options: RUN_STYLES },
      { key: "runs.lineWidth", kind: "range", min: 0.5, max: 10, step: 0.5, unit: "px" },
      { key: "runs.opacity", kind: "range", min: 0, max: 1, step: 0.05 },
      { key: "runs.dashed", kind: "toggle" },
    ],
  },
  {
    id: "tradeRoutes",
    controls: [
      { key: "tradeRoutes.enabled", kind: "toggle" },
      { key: "tradeRoutes.style", kind: "choice", options: TRADE_STYLES },
      { key: "tradeRoutes.widthMode", kind: "choice", options: TRADE_WIDTH_MODES },
      { key: "tradeRoutes.minWidth", kind: "range", min: 0.5, max: 20, step: 0.5, unit: "px" },
      { key: "tradeRoutes.maxWidth", kind: "range", min: 1, max: 40, step: 0.5, unit: "px" },
      { key: "tradeRoutes.colorMode", kind: "choice", options: TRADE_COLOR_MODES },
      { key: "tradeRoutes.color", kind: "color" },
      { key: "tradeRoutes.lowBandwidthColor", kind: "color" },
      { key: "tradeRoutes.highBandwidthColor", kind: "color" },
      { key: "tradeRoutes.maxHeight", kind: "range", min: 0, max: 400, step: 5, unit: "m" },
      { key: "tradeRoutes.packets", kind: "toggle" },
      { key: "tradeRoutes.packetSpeed", kind: "range", min: 0.1, max: 5, step: 0.1, unit: "×" },
      { key: "tradeRoutes.packetSize", kind: "range", min: 1, max: 12, step: 0.5, unit: "px" },
    ],
  },
  {
    id: "scenario",
    controls: [
      { key: "scenario.seed", kind: "range", min: 1, max: 999, step: 1 },
      { key: "scenario.players", kind: "range", min: 1, max: 200, step: 1 },
      { key: "scenario.runsPerPlayer", kind: "range", min: 1, max: 12, step: 1 },
      { key: "scenario.runLengthKm", kind: "range", min: 1, max: 20, step: 0.5, unit: "km" },
      { key: "scenario.tradeRoutes", kind: "range", min: 0, max: 12, step: 1 },
      { key: "scenario.areaKm", kind: "range", min: 0.5, max: 6, step: 0.5, unit: "km" },
      { key: "scenario.fillPercent", kind: "range", min: 0, max: 100, step: 5, unit: "%" },
    ],
  },
];

const HIDDEN_NUMBER_LIMITS: Partial<Record<SettingKey, readonly [number, number]>> = {
  "scenario.centerLongitude": [-180, 180],
  "scenario.centerLatitude": [-85, 85],
};

const COLOR_PATTERN = /^#[0-9a-f]{6}$/i;
const CONTROLS_BY_KEY: ReadonlyMap<SettingKey, Control> = new Map(
  CONTROL_GROUPS.flatMap((group) => group.controls).map((control) => [control.key, control]),
);

export function sanitizeSettings(input: unknown): Settings {
  const source = typeof input === "object" && input !== null ? (input as Record<string, unknown>) : {};
  const result: Record<string, unknown> = { ...DEFAULT_SETTINGS };
  for (const key of Object.keys(DEFAULT_SETTINGS) as SettingKey[]) {
    const value = source[key];
    if (isValidValue(key, value)) result[key] = value;
  }
  return result as unknown as Settings;
}

function isValidValue(key: SettingKey, value: unknown): boolean {
  const control = CONTROLS_BY_KEY.get(key);
  if (!control) return isValidHiddenNumber(key, value);
  if (control.kind === "toggle") return typeof value === "boolean";
  if (control.kind === "color") return typeof value === "string" && COLOR_PATTERN.test(value);
  if (control.kind === "choice") return typeof value === "string" && control.options.includes(value);
  return typeof value === "number" && Number.isFinite(value) && value >= control.min && value <= control.max;
}

function isValidHiddenNumber(key: SettingKey, value: unknown): boolean {
  const limits = HIDDEN_NUMBER_LIMITS[key];
  if (!limits || typeof value !== "number" || !Number.isFinite(value)) return false;
  return value >= limits[0] && value <= limits[1];
}
