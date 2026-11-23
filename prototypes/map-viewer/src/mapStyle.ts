import type { ExpressionSpecification, LayerSpecification, StyleSpecification } from "maplibre-gl";
import { BASE_MAP_PALETTES, type BaseMapPalette, type BaseMapTheme } from "./basemapPalettes.ts";
import type { DataLayerName } from "./dataset.ts";

export interface ThemedPaint {
  layerId: string;
  property: "background-color" | "fill-color" | "fill-outline-color" | "line-color";
  value: ExpressionSpecification | string;
}

const STANDARD = BASE_MAP_PALETTES.standard;
const BUILDINGS_MIN_ZOOM = 13;
const PATHS_MIN_ZOOM = 12;
const PATH_KINDS = ["footway", "path", "cycleway", "bridleway", "steps", "track"];
const MAJOR_ROAD_KINDS = ["motorway", "motorway_link", "trunk", "trunk_link", "primary", "primary_link"];
const SECONDARY_ROAD_KINDS = ["secondary", "secondary_link", "tertiary", "tertiary_link"];
const MUNICIPALITY_ADMIN_LEVEL = "8";

const LAYER_IDS = {
  background: "background",
  landcover: "landcover",
  water: "water",
  waterways: "waterways",
  railways: "railways",
  roadsCasing: "roads-casing",
  roads: "roads",
  paths: "roads-paths",
  buildings: "buildings",
  boundaries: "boundaries",
} as const;

export function sourceId(layer: DataLayerName): string {
  return `osm-${layer}`;
}

export function themePaint(theme: BaseMapTheme): ThemedPaint[] {
  const palette = BASE_MAP_PALETTES[theme];
  return [
    { layerId: LAYER_IDS.background, property: "background-color", value: palette.background },
    { layerId: LAYER_IDS.landcover, property: "fill-color", value: landcoverColor(palette) },
    { layerId: LAYER_IDS.water, property: "fill-color", value: palette.water },
    { layerId: LAYER_IDS.waterways, property: "line-color", value: palette.water },
    { layerId: LAYER_IDS.railways, property: "line-color", value: palette.railway },
    { layerId: LAYER_IDS.roadsCasing, property: "line-color", value: palette.roadCasing },
    { layerId: LAYER_IDS.roads, property: "line-color", value: roadColor(palette) },
    { layerId: LAYER_IDS.paths, property: "line-color", value: pathColor(palette) },
    { layerId: LAYER_IDS.buildings, property: "fill-color", value: palette.building },
    { layerId: LAYER_IDS.buildings, property: "fill-outline-color", value: palette.buildingOutline },
    { layerId: LAYER_IDS.boundaries, property: "line-color", value: boundaryColor(palette) },
  ];
}

function landcoverColor(palette: BaseMapPalette): ExpressionSpecification {
  return [
    "match",
    ["get", "kind"],
    ["forest", "wood"],
    palette.forest,
    ["meadow", "grass", "grassland", "village_green", "recreation_ground", "heath", "scrub"],
    palette.grass,
    ["farmland", "orchard", "vineyard", "allotments"],
    palette.farmland,
    "residential",
    palette.residential,
    ["industrial", "commercial", "retail"],
    palette.industrial,
    "cemetery",
    palette.cemetery,
    ["park", "garden", "pitch", "playground", "golf_course"],
    palette.park,
    palette.landcoverOther,
  ];
}

function roadColor(palette: BaseMapPalette): ExpressionSpecification {
  return [
    "match",
    ["get", "kind"],
    MAJOR_ROAD_KINDS,
    palette.roadMajor,
    SECONDARY_ROAD_KINDS,
    palette.roadSecondary,
    palette.roadMinor,
  ];
}

function pathColor(palette: BaseMapPalette): ExpressionSpecification {
  return ["match", ["get", "kind"], "track", palette.track, palette.path];
}

function boundaryColor(palette: BaseMapPalette): ExpressionSpecification {
  return [
    "match",
    ["get", "kind"],
    MUNICIPALITY_ADMIN_LEVEL,
    palette.boundaryMunicipality,
    palette.boundaryRegion,
  ];
}

export const STYLE_LAYERS: Readonly<Record<DataLayerName, readonly LayerSpecification[]>> = {
  landcover: [
    {
      id: LAYER_IDS.landcover,
      type: "fill",
      source: sourceId("landcover"),
      paint: { "fill-color": landcoverColor(STANDARD) },
    },
  ],
  water: [{ id: LAYER_IDS.water, type: "fill", source: sourceId("water"), paint: { "fill-color": STANDARD.water } }],
  waterways: [
    {
      id: LAYER_IDS.waterways,
      type: "line",
      source: sourceId("waterways"),
      paint: {
        "line-color": STANDARD.water,
        "line-width": ["match", ["get", "kind"], ["river", "canal"], 3, 1.2],
      },
    },
  ],
  railways: [
    {
      id: LAYER_IDS.railways,
      type: "line",
      source: sourceId("railways"),
      paint: { "line-color": STANDARD.railway, "line-width": 1.5, "line-dasharray": [3, 2] },
    },
  ],
  roads: [
    {
      id: LAYER_IDS.roadsCasing,
      type: "line",
      source: sourceId("roads"),
      filter: ["!", ["in", ["get", "kind"], ["literal", PATH_KINDS]]],
      layout: { "line-cap": "round", "line-join": "round" },
      paint: {
        "line-color": STANDARD.roadCasing,
        "line-width": ["interpolate", ["linear"], ["zoom"], 10, 1, 14, 5, 18, 18],
      },
    },
    {
      id: LAYER_IDS.roads,
      type: "line",
      source: sourceId("roads"),
      filter: ["!", ["in", ["get", "kind"], ["literal", PATH_KINDS]]],
      layout: { "line-cap": "round", "line-join": "round" },
      paint: {
        "line-color": roadColor(STANDARD),
        "line-width": ["interpolate", ["linear"], ["zoom"], 10, 0.5, 14, 3.5, 18, 15],
      },
    },
    {
      id: LAYER_IDS.paths,
      type: "line",
      source: sourceId("roads"),
      minzoom: PATHS_MIN_ZOOM,
      filter: ["in", ["get", "kind"], ["literal", PATH_KINDS]],
      paint: {
        "line-color": pathColor(STANDARD),
        "line-width": 1.2,
        "line-dasharray": [2, 1.5],
      },
    },
  ],
  buildings: [
    {
      id: LAYER_IDS.buildings,
      type: "fill",
      source: sourceId("buildings"),
      minzoom: BUILDINGS_MIN_ZOOM,
      paint: { "fill-color": STANDARD.building, "fill-outline-color": STANDARD.buildingOutline },
    },
  ],
  boundaries: [
    {
      id: LAYER_IDS.boundaries,
      type: "line",
      source: sourceId("boundaries"),
      paint: {
        "line-color": boundaryColor(STANDARD),
        "line-width": ["match", ["get", "kind"], MUNICIPALITY_ADMIN_LEVEL, 1, 2.5],
        "line-dasharray": [4, 2],
      },
    },
  ],
};

export const BASE_STYLE: StyleSpecification = {
  version: 8,
  sources: {},
  layers: [{ id: LAYER_IDS.background, type: "background", paint: { "background-color": STANDARD.background } }],
};

export const BUILDINGS_VISIBLE_FROM_ZOOM = BUILDINGS_MIN_ZOOM;
