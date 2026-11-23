import type { LayerSpecification, StyleSpecification } from "maplibre-gl";
import type { DataLayerName } from "./dataset.ts";

const COLORS = {
  background: "#0b0d12",
  forest: "#11201a",
  grass: "#131c17",
  farmland: "#12161a",
  residential: "#14171d",
  industrial: "#16151c",
  cemetery: "#112019",
  park: "#122119",
  landcoverOther: "#111419",
  water: "#0b2233",
  waterway: "#12364d",
  railway: "#3a404b",
  roadMajor: "#5b6473",
  roadSecondary: "#454c58",
  roadMinor: "#2c323c",
  roadCasing: "#07080b",
  path: "#2f3540",
  building: "#1a1e26",
  buildingOutline: "#222731",
  boundaryRegion: "#4a4f5c",
  boundaryMunicipality: "#2f333d",
} as const;

const BUILDINGS_MIN_ZOOM = 14;
const PATHS_MIN_ZOOM = 14.5;
const MUNICIPALITY_BOUNDARY_MIN_ZOOM = 11;
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
        "line-color": COLORS.waterway,
        "line-width": ["match", ["get", "kind"], ["river", "canal"], 2.5, 1],
      },
    },
  ],
  railways: [
    {
      id: "railways",
      type: "line",
      source: sourceId("railways"),
      paint: { "line-color": COLORS.railway, "line-width": 1.2, "line-dasharray": [3, 2] },
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
        "line-width": ["interpolate", ["linear"], ["zoom"], 10, 0.8, 14, 4.5, 18, 17],
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
        "line-color": COLORS.path,
        "line-width": 1,
        "line-dasharray": [2, 2],
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
      id: "boundaries-municipal",
      type: "line",
      source: sourceId("boundaries"),
      minzoom: MUNICIPALITY_BOUNDARY_MIN_ZOOM,
      filter: ["==", ["get", "kind"], MUNICIPALITY_ADMIN_LEVEL],
      paint: { "line-color": COLORS.boundaryMunicipality, "line-width": 0.8, "line-dasharray": [4, 3] },
    },
    {
      id: "boundaries",
      type: "line",
      source: sourceId("boundaries"),
      filter: ["!=", ["get", "kind"], MUNICIPALITY_ADMIN_LEVEL],
      paint: { "line-color": COLORS.boundaryRegion, "line-width": 1.5, "line-dasharray": [4, 3] },
    },
  ],
};

export const BASE_STYLE: StyleSpecification = {
  version: 8,
  sources: {},
  layers: [{ id: "background", type: "background", paint: { "background-color": COLORS.background } }],
};
