import type { LayerSpecification, StyleSpecification } from "maplibre-gl";
import type { DataLayerName } from "./dataset.ts";

const COLORS = {
  background: "#f2efe9",
  forest: "#add19e",
  grass: "#cdebb0",
  farmland: "#eef0d5",
  residential: "#e0dfdf",
  industrial: "#ebdbe8",
  cemetery: "#aacbaf",
  park: "#c8facc",
  landcoverOther: "#e6e6d8",
  water: "#aad3df",
  railway: "#707070",
  roadMajor: "#f9b29c",
  roadSecondary: "#f7fabf",
  roadMinor: "#ffffff",
  roadCasing: "#bbbbbb",
  path: "#fa8072",
  track: "#996600",
  building: "#d9d0c9",
  buildingOutline: "#c4b6ab",
  boundaryRegion: "#8d618b",
  boundaryMunicipality: "#b19bb0",
} as const;

const BUILDINGS_MIN_ZOOM = 13;
const PATHS_MIN_ZOOM = 12;
const PATH_KINDS = ["footway", "path", "cycleway", "bridleway", "steps", "track"];
const MAJOR_ROAD_KINDS = ["motorway", "motorway_link", "trunk", "trunk_link", "primary", "primary_link"];
const SECONDARY_ROAD_KINDS = ["secondary", "secondary_link", "tertiary", "tertiary_link"];
const MUNICIPALITY_ADMIN_LEVEL = "8";

export function sourceId(layer: DataLayerName): string {
  return `osm-${layer}`;
}

export const STYLE_LAYERS: Readonly<Record<DataLayerName, readonly LayerSpecification[]>> = {
  landcover: [
    {
      id: "landcover",
      type: "fill",
      source: sourceId("landcover"),
      paint: {
        "fill-color": [
          "match",
          ["get", "kind"],
          ["forest", "wood"],
          COLORS.forest,
          ["meadow", "grass", "grassland", "village_green", "recreation_ground", "heath", "scrub"],
          COLORS.grass,
          ["farmland", "orchard", "vineyard", "allotments"],
          COLORS.farmland,
          "residential",
          COLORS.residential,
          ["industrial", "commercial", "retail"],
          COLORS.industrial,
          "cemetery",
          COLORS.cemetery,
          ["park", "garden", "pitch", "playground", "golf_course"],
          COLORS.park,
          COLORS.landcoverOther,
        ],
      },
    },
  ],
  water: [{ id: "water", type: "fill", source: sourceId("water"), paint: { "fill-color": COLORS.water } }],
  waterways: [
    {
      id: "waterways",
      type: "line",
      source: sourceId("waterways"),
      paint: {
        "line-color": COLORS.water,
        "line-width": ["match", ["get", "kind"], ["river", "canal"], 3, 1.2],
      },
    },
  ],
  railways: [
    {
      id: "railways",
      type: "line",
      source: sourceId("railways"),
      paint: { "line-color": COLORS.railway, "line-width": 1.5, "line-dasharray": [3, 2] },
    },
  ],
  roads: [
    {
      id: "roads-casing",
      type: "line",
      source: sourceId("roads"),
      filter: ["!", ["in", ["get", "kind"], ["literal", PATH_KINDS]]],
      layout: { "line-cap": "round", "line-join": "round" },
      paint: {
        "line-color": COLORS.roadCasing,
        "line-width": ["interpolate", ["linear"], ["zoom"], 10, 1, 14, 5, 18, 18],
      },
    },
    {
      id: "roads",
      type: "line",
      source: sourceId("roads"),
      filter: ["!", ["in", ["get", "kind"], ["literal", PATH_KINDS]]],
      layout: { "line-cap": "round", "line-join": "round" },
      paint: {
        "line-color": [
          "match",
          ["get", "kind"],
          MAJOR_ROAD_KINDS,
          COLORS.roadMajor,
          SECONDARY_ROAD_KINDS,
          COLORS.roadSecondary,
          COLORS.roadMinor,
        ],
        "line-width": ["interpolate", ["linear"], ["zoom"], 10, 0.5, 14, 3.5, 18, 15],
      },
    },
    {
      id: "roads-paths",
      type: "line",
      source: sourceId("roads"),
      minzoom: PATHS_MIN_ZOOM,
      filter: ["in", ["get", "kind"], ["literal", PATH_KINDS]],
      paint: {
        "line-color": ["match", ["get", "kind"], "track", COLORS.track, COLORS.path],
        "line-width": 1.2,
        "line-dasharray": [2, 1.5],
      },
    },
  ],
  buildings: [
    {
      id: "buildings",
      type: "fill",
      source: sourceId("buildings"),
      minzoom: BUILDINGS_MIN_ZOOM,
      paint: { "fill-color": COLORS.building, "fill-outline-color": COLORS.buildingOutline },
    },
  ],
  boundaries: [
    {
      id: "boundaries",
      type: "line",
      source: sourceId("boundaries"),
      paint: {
        "line-color": [
          "match",
          ["get", "kind"],
          MUNICIPALITY_ADMIN_LEVEL,
          COLORS.boundaryMunicipality,
          COLORS.boundaryRegion,
        ],
        "line-width": ["match", ["get", "kind"], MUNICIPALITY_ADMIN_LEVEL, 1, 2.5],
        "line-dasharray": [4, 2],
      },
    },
  ],
};

export const BASE_STYLE: StyleSpecification = {
  version: 8,
  sources: {},
  layers: [{ id: "background", type: "background", paint: { "background-color": COLORS.background } }],
};

export const BUILDINGS_VISIBLE_FROM_ZOOM = BUILDINGS_MIN_ZOOM;
