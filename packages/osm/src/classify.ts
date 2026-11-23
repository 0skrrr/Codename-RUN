import type { Tags } from "./types.ts";

export const LAYER_NAMES = [
  "landcover",
  "water",
  "waterways",
  "railways",
  "roads",
  "buildings",
  "boundaries",
] as const;

export type LayerName = (typeof LAYER_NAMES)[number];

export interface Classification {
  readonly layer: LayerName;
  readonly kind: string;
}

const ROAD_KINDS: ReadonlySet<string> = new Set([
  "motorway",
  "motorway_link",
  "trunk",
  "trunk_link",
  "primary",
  "primary_link",
  "secondary",
  "secondary_link",
  "tertiary",
  "tertiary_link",
  "unclassified",
  "residential",
  "living_street",
  "service",
  "pedestrian",
  "track",
  "path",
  "footway",
  "cycleway",
  "bridleway",
  "steps",
]);

const RAILWAY_KINDS: ReadonlySet<string> = new Set(["rail", "light_rail", "narrow_gauge", "tram", "subway"]);

const WATERWAY_KINDS: ReadonlySet<string> = new Set(["river", "stream", "canal", "ditch", "drain"]);

const LANDCOVER_KINDS_BY_KEY: ReadonlyArray<readonly [string, ReadonlySet<string>]> = [
  ["natural", new Set(["wood", "scrub", "grassland", "heath", "wetland", "bare_rock"])],
  [
    "landuse",
    new Set([
      "forest",
      "meadow",
      "grass",
      "farmland",
      "orchard",
      "vineyard",
      "allotments",
      "cemetery",
      "recreation_ground",
      "village_green",
      "residential",
      "industrial",
      "commercial",
      "retail",
    ]),
  ],
  ["leisure", new Set(["park", "garden", "pitch", "playground", "golf_course"])],
];

const WATER_AREA_TAGS: ReadonlyArray<readonly [string, string]> = [
  ["natural", "water"],
  ["waterway", "riverbank"],
  ["landuse", "reservoir"],
  ["landuse", "basin"],
];

export function classifyArea(tags: Tags): Classification | undefined {
  if (tags.area === "no") return undefined;
  if (tags.building !== undefined && tags.building !== "no") {
    return { layer: "buildings", kind: tags.building };
  }
  if (WATER_AREA_TAGS.some(([key, value]) => tags[key] === value)) {
    return { layer: "water", kind: tags.water ?? "water" };
  }
  for (const [key, kinds] of LANDCOVER_KINDS_BY_KEY) {
    const value = tags[key];
    if (value !== undefined && kinds.has(value)) return { layer: "landcover", kind: value };
  }
  return undefined;
}

export function classifyLine(tags: Tags): Classification | undefined {
  if (tags.highway !== undefined && ROAD_KINDS.has(tags.highway)) {
    return { layer: "roads", kind: tags.highway };
  }
  if (tags.railway !== undefined && RAILWAY_KINDS.has(tags.railway)) {
    return { layer: "railways", kind: tags.railway };
  }
  if (tags.waterway !== undefined && WATERWAY_KINDS.has(tags.waterway)) {
    return { layer: "waterways", kind: tags.waterway };
  }
  return undefined;
}

export function classifyBoundary(tags: Tags): Classification | undefined {
  const isAdministrative = tags.type === "boundary" && tags.boundary === "administrative";
  if (!isAdministrative || tags.admin_level === undefined) return undefined;
  return { layer: "boundaries", kind: tags.admin_level };
}
