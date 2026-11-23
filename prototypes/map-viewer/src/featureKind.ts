import type { DataLayerName } from "./dataset.ts";

export const TRANSLATED_KINDS: Readonly<Record<Exclude<DataLayerName, "boundaries">, readonly string[]>> = {
  buildings: ["house", "yes", "residential", "garage", "barn", "civic", "industrial", "warehouse", "commercial", "cabin", "roof", "apartments", "chapel", "school", "transportation", "hotel", "farm_auxiliary", "kindergarten", "shed", "greenhouse", "construction", "retail", "church", "service", "bungalow", "hospital", "religious"],
  roads: ["motorway", "motorway_link", "trunk", "primary", "primary_link", "secondary", "secondary_link", "tertiary", "tertiary_link", "unclassified", "residential", "living_street", "service", "track", "footway", "path", "steps", "cycleway", "pedestrian", "bridleway"],
  landcover: ["meadow", "wood", "forest", "farmland", "grass", "orchard", "scrub", "pitch", "residential", "playground", "industrial", "garden", "grassland", "allotments", "park", "retail", "recreation_ground", "cemetery", "wetland", "bare_rock", "village_green", "commercial", "heath", "golf_course", "vineyard"],
  water: ["reservoir", "pond", "water", "lake", "wastewater", "basin", "river", "oxbow", "stream", "lock", "canal"],
  waterways: ["stream", "ditch", "river", "drain", "canal"],
  railways: ["rail", "narrow_gauge", "tram"],
};

export type KindLabel =
  | { kind: "message"; key: string; values?: Readonly<Record<string, string>> }
  | { kind: "raw"; text: string };

export function kindLabel(layer: DataLayerName, kind: string): KindLabel {
  if (layer === "boundaries") return { kind: "message", key: "mapViewer.kind.boundaryLevel", values: { level: kind } };
  if (TRANSLATED_KINDS[layer].includes(kind)) return { kind: "message", key: `mapViewer.kind.${layer}.${kind}` };
  return { kind: "raw", text: kind.replaceAll("_", " ") };
}
