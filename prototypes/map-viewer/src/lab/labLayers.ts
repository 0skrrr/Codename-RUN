import type {
  ExpressionSpecification,
  GeoJSONSource,
  LayerSpecification,
  Map as MapLibreMap,
} from "maplibre-gl";
import { BASE_MAP_PALETTES } from "../basemapPalettes.ts";
import { themePaint } from "../mapStyle.ts";
import { featureCollection, type LabFeatureCollection } from "./geo.ts";
import type { Settings } from "./settings.ts";

export const LAB_SOURCES = {
  grid: "lab-grid",
  territory: "lab-territory",
  runLines: "lab-run-lines",
  runCells: "lab-run-cells",
  tradeLines: "lab-trade-lines",
  tradeCells: "lab-trade-cells",
  packets: "lab-packets",
} as const;

type LabSource = (typeof LAB_SOURCES)[keyof typeof LAB_SOURCES];

const LAYER = {
  grid: "lab-grid-line",
  territoryFill: "lab-territory-fill",
  territoryExtrusion: "lab-territory-extrusion",
  territoryOutline: "lab-territory-outline",
  runCells: "lab-run-cells",
  runLine: "lab-run-line",
  tradeCells: "lab-trade-cells",
  tradeExtrusion: "lab-trade-extrusion",
  tradeLine: "lab-trade-line",
  packets: "lab-packets",
  buildingExtrusion: "lab-building-extrusion",
} as const;

const BUILDINGS_SOURCE = "osm-buildings";
const BUILDINGS_MIN_ZOOM = 13;
const PACKET_STROKE_COLOR = "#ffffff";
const RUN_CELL_OPACITY_FACTOR = 0.5;
const TRADE_CELL_OPACITY = 0.55;
const MIN_TRADE_EXTRUSION_FACTOR = 0.1;
const DASHED_LINE: [number, number] = [2, 1.5];
const SOLID_LINE: [number, number] = [1, 0];
const BASE_OPACITY_PROPERTIES: Readonly<Record<string, "fill-opacity" | "line-opacity">> = {
  fill: "fill-opacity",
  line: "line-opacity",
};

const SHARE: ExpressionSpecification = ["get", "share"];

export function addLabLayers(map: MapLibreMap): void {
  for (const source of Object.values(LAB_SOURCES)) {
    map.addSource(source, { type: "geojson", data: featureCollection([]) });
  }
  for (const layer of labLayerSpecifications(map.getSource(BUILDINGS_SOURCE) !== undefined)) map.addLayer(layer);
}

export function setLabData(map: MapLibreMap, source: LabSource, data: LabFeatureCollection): void {
  (map.getSource(source) as GeoJSONSource | undefined)?.setData(data);
}

export function applyLabSettings(map: MapLibreMap, settings: Settings, baseLayerIds: readonly string[]): void {
  const extruded = settings["view.mode"] === "extruded";
  applyBaseMap(map, settings, baseLayerIds, extruded);
  applyGrid(map, settings);
  applyTerritory(map, settings, extruded);
  applyRuns(map, settings);
  applyTradeRoutes(map, settings, extruded);
  if (Math.round(map.getPitch()) !== settings["view.pitch"]) map.easeTo({ pitch: settings["view.pitch"] });
}

function applyBaseMap(map: MapLibreMap, settings: Settings, baseLayerIds: readonly string[], extruded: boolean): void {
  const theme = settings["baseMap.theme"];
  for (const { layerId, property, value } of themePaint(theme)) {
    if (map.getLayer(layerId)) map.setPaintProperty(layerId, property, value);
  }
  for (const id of baseLayerIds) {
    const property = BASE_OPACITY_PROPERTIES[map.getLayer(id)?.type ?? ""];
    if (property) map.setPaintProperty(id, property, settings["baseMap.opacity"]);
  }
  if (!map.getLayer(LAYER.buildingExtrusion)) return;
  setVisible(map, LAYER.buildingExtrusion, extruded && settings["baseMap.extrudeBuildings"]);
  map.setPaintProperty(LAYER.buildingExtrusion, "fill-extrusion-color", BASE_MAP_PALETTES[theme].building);
  map.setPaintProperty(LAYER.buildingExtrusion, "fill-extrusion-height", settings["baseMap.buildingHeight"]);
  map.setPaintProperty(LAYER.buildingExtrusion, "fill-extrusion-opacity", settings["baseMap.opacity"]);
}

function applyGrid(map: MapLibreMap, settings: Settings): void {
  setVisible(map, LAYER.grid, settings["hexGrid.enabled"]);
  map.setPaintProperty(LAYER.grid, "line-color", settings["hexGrid.lineColor"]);
  map.setPaintProperty(LAYER.grid, "line-width", settings["hexGrid.lineWidth"]);
  map.setPaintProperty(LAYER.grid, "line-opacity", settings["hexGrid.lineOpacity"]);
}

function applyTerritory(map: MapLibreMap, settings: Settings, extruded: boolean): void {
  const enabled = settings["territory.enabled"];
  const style = settings["territory.style"];
  const showFill = enabled && style !== "outline";
  const showOutline = enabled && style !== "fill";
  setVisible(map, LAYER.territoryFill, showFill && !extruded);
  setVisible(map, LAYER.territoryExtrusion, showFill && extruded);
  setVisible(map, LAYER.territoryOutline, showOutline);

  const fillOpacity = settings["territory.fillOpacity"];
  map.setPaintProperty(
    LAYER.territoryFill,
    "fill-opacity",
    settings["simplify.fadeByShare"] ? ["*", fillOpacity, ["coalesce", ["get", "share"], 1]] : fillOpacity,
  );
  map.setPaintProperty(LAYER.territoryExtrusion, "fill-extrusion-opacity", settings["territory.fillOpacity"]);
  const height = settings["territory.height"];
  map.setPaintProperty(
    LAYER.territoryExtrusion,
    "fill-extrusion-height",
    settings["territory.heightByPlayer"] ? ["*", height, ["get", "heightFactor"]] : height,
  );
  map.setPaintProperty(LAYER.territoryOutline, "line-width", settings["territory.outlineWidth"]);
  const outlineShape = settings["territory.border"] === "merged" ? "merged" : "cell";
  map.setFilter(LAYER.territoryOutline, ["==", ["get", "shape"], outlineShape]);
}

function applyRuns(map: MapLibreMap, settings: Settings): void {
  const enabled = settings["runs.enabled"];
  const style = settings["runs.style"];
  setVisible(map, LAYER.runLine, enabled && style !== "hexes");
  setVisible(map, LAYER.runCells, enabled && style !== "line");
  map.setPaintProperty(LAYER.runLine, "line-width", settings["runs.lineWidth"]);
  map.setPaintProperty(LAYER.runLine, "line-opacity", settings["runs.opacity"]);
  map.setPaintProperty(LAYER.runLine, "line-dasharray", settings["runs.dashed"] ? DASHED_LINE : SOLID_LINE);
  map.setPaintProperty(LAYER.runCells, "fill-opacity", settings["runs.opacity"] * RUN_CELL_OPACITY_FACTOR);
}

function applyTradeRoutes(map: MapLibreMap, settings: Settings, extruded: boolean): void {
  const enabled = settings["tradeRoutes.enabled"];
  const style = settings["tradeRoutes.style"];
  const showCells = enabled && style !== "line";
  setVisible(map, LAYER.tradeLine, enabled && style !== "hexChain");
  setVisible(map, LAYER.tradeCells, showCells && !extruded);
  setVisible(map, LAYER.tradeExtrusion, showCells && extruded);
  setVisible(map, LAYER.packets, enabled && settings["tradeRoutes.packets"]);

  const color = tradeColor(settings);
  map.setPaintProperty(LAYER.tradeLine, "line-color", color);
  map.setPaintProperty(LAYER.tradeCells, "fill-color", color);
  map.setPaintProperty(LAYER.tradeExtrusion, "fill-extrusion-color", color);
  map.setPaintProperty(LAYER.packets, "circle-color", color);
  map.setPaintProperty(LAYER.tradeLine, "line-width", tradeWidth(settings));
  map.setPaintProperty(LAYER.packets, "circle-radius", settings["tradeRoutes.packetSize"]);
  map.setPaintProperty(LAYER.tradeExtrusion, "fill-extrusion-height", [
    "*",
    settings["tradeRoutes.maxHeight"],
    ["max", MIN_TRADE_EXTRUSION_FACTOR, SHARE],
  ]);
}

function tradeColor(settings: Settings): ExpressionSpecification | string {
  if (settings["tradeRoutes.colorMode"] === "fixed") return settings["tradeRoutes.color"];
  return [
    "interpolate",
    ["linear"],
    SHARE,
    0,
    settings["tradeRoutes.lowBandwidthColor"],
    1,
    settings["tradeRoutes.highBandwidthColor"],
  ];
}

function tradeWidth(settings: Settings): ExpressionSpecification | number {
  const minimum = settings["tradeRoutes.minWidth"];
  if (settings["tradeRoutes.widthMode"] === "fixed") return minimum;
  const maximum = Math.max(minimum, settings["tradeRoutes.maxWidth"]);
  return ["interpolate", ["linear"], SHARE, 0, minimum, 1, maximum];
}

function setVisible(map: MapLibreMap, layerId: string, visible: boolean): void {
  if (map.getLayer(layerId)) map.setLayoutProperty(layerId, "visibility", visible ? "visible" : "none");
}

function labLayerSpecifications(hasBuildings: boolean): LayerSpecification[] {
  const color: ExpressionSpecification = ["get", "color"];
  const layers: LayerSpecification[] = [
    { id: LAYER.grid, type: "line", source: LAB_SOURCES.grid, paint: {} },
    { id: LAYER.territoryFill, type: "fill", source: LAB_SOURCES.territory, filter: ["==", ["get", "shape"], "cell"], paint: { "fill-color": color } },
    {
      id: LAYER.territoryExtrusion,
      type: "fill-extrusion",
      source: LAB_SOURCES.territory,
      filter: ["==", ["get", "shape"], "cell"],
      paint: { "fill-extrusion-color": color, "fill-extrusion-base": 0 },
    },
    { id: LAYER.territoryOutline, type: "line", source: LAB_SOURCES.territory, layout: { "line-join": "round" }, paint: { "line-color": color } },
    { id: LAYER.runCells, type: "fill", source: LAB_SOURCES.runCells, paint: { "fill-color": color } },
    { id: LAYER.tradeCells, type: "fill", source: LAB_SOURCES.tradeCells, paint: { "fill-opacity": TRADE_CELL_OPACITY } },
    { id: LAYER.tradeExtrusion, type: "fill-extrusion", source: LAB_SOURCES.tradeCells, paint: { "fill-extrusion-base": 0 } },
    { id: LAYER.tradeLine, type: "line", source: LAB_SOURCES.tradeLines, layout: { "line-cap": "round", "line-join": "round" }, paint: {} },
    { id: LAYER.runLine, type: "line", source: LAB_SOURCES.runLines, layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": color } },
    { id: LAYER.packets, type: "circle", source: LAB_SOURCES.packets, paint: { "circle-stroke-color": PACKET_STROKE_COLOR, "circle-stroke-width": 1 } },
  ];
  if (!hasBuildings) return layers;
  return [
    {
      id: LAYER.buildingExtrusion,
      type: "fill-extrusion",
      source: BUILDINGS_SOURCE,
      minzoom: BUILDINGS_MIN_ZOOM,
      paint: { "fill-extrusion-base": 0 },
    },
    ...layers,
  ];
}
