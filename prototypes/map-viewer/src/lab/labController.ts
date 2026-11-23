import { getHexagonAreaAvg, getHexagonEdgeLengthAvg } from "h3-js";
import type { Map as MapLibreMap } from "maplibre-gl";
import { cumulativeDistances, featureCollection, pointAlongPath, type LabFeature, type LngLat } from "./geo.ts";
import {
  gridFeatures,
  hexFadeZooms,
  runFeatures,
  territoryFeatures,
  territoryOwnership,
  territorySizes,
  tradeRouteFeatures,
  type Bounds,
  type HexFadeZooms,
  type TerritorySize,
} from "./hexes.ts";
import { addLabLayers, applyLabSettings, LAB_SOURCES, setLabData } from "./labLayers.ts";
import { buildRoadGraph, type RoadGraph } from "./roadGraph.ts";
import { generateScenario, type Scenario, type TradeRoute } from "./scenario.ts";
import type { SettingKey, Settings } from "./settings.ts";

export interface LabInfo {
  players: number;
  runs: number;
  tradeRoutes: number;
  territoryHexes: number;
  hexEdgeMeters: number;
  hexAreaSquareMeters: number;
  roadsMissing: boolean;
  hexFade: HexFadeZooms;
  territories: TerritorySize[];
}

export interface LabController {
  update(settings: Settings, changedKey?: SettingKey): void;
  mapCenter(): LngLat;
}

const GRAPH_RADIUS_METERS = 6_000;
const MAX_GRID_CELLS = 25_000;
const GRID_PADDING_FACTOR = 0.5;
const METERS_PER_KILOMETER = 1_000;
const SQUARE_METERS_PER_SQUARE_KILOMETER = 1_000_000;
const PACKET_METERS_PER_SECOND = 120;
const MILLISECONDS_PER_SECOND = 1_000;
const MAX_PACKETS_PER_ROUTE = 6;
const EXCLUDED_ROAD_KINDS: ReadonlySet<string> = new Set(["motorway", "motorway_link", "trunk", "trunk_link"]);
const HEX_DATA_KEYS: ReadonlySet<SettingKey> = new Set(["hexGrid.resolution", "territory.growth"]);
const GRID_KEYS: ReadonlySet<SettingKey> = new Set(["hexGrid.resolution", "zoom.hexesFromPixels"]);

interface PacketRoute {
  path: LngLat[];
  cumulative: number[];
  length: number;
  share: number;
  packets: number;
}

export async function createLab(
  map: MapLibreMap,
  roadsUrl: string | undefined,
  initialSettings: Settings,
  baseLayerIds: readonly string[],
  onInfo: (info: LabInfo) => void,
): Promise<LabController> {
  addLabLayers(map);
  const roadLines = roadsUrl ? await loadWalkableRoads(roadsUrl) : [];

  let settings = initialSettings;
  let graph: RoadGraph | undefined;
  let graphCenterKey = "";
  let scenario: Scenario = { players: [], runs: [], tradeRoutes: [] };
  let territoryHexes = 0;
  let owners = new Map<string, number>();
  let packetRoutes: PacketRoute[] = [];

  const center = (): LngLat => [settings["scenario.centerLongitude"], settings["scenario.centerLatitude"]];

  const rebuildScenario = (): void => {
    const key = center().join(",");
    if (!graph || key !== graphCenterKey) {
      graph = buildRoadGraph(roadLines, center(), GRAPH_RADIUS_METERS);
      graphCenterKey = key;
    }
    scenario = generateScenario(graph, {
      seed: settings["scenario.seed"],
      players: settings["scenario.players"],
      runsPerPlayer: settings["scenario.runsPerPlayer"],
      runLengthMeters: settings["scenario.runLengthKm"] * METERS_PER_KILOMETER,
      tradeRoutes: settings["scenario.tradeRoutes"],
    });
    packetRoutes = scenario.tradeRoutes.map(toPacketRoute);
  };

  const hexFade = (): HexFadeZooms =>
    hexFadeZooms(settings["hexGrid.resolution"], settings["scenario.centerLatitude"], settings["zoom.hexesFromPixels"]);

  const rebuildHexData = (): void => {
    const resolution = settings["hexGrid.resolution"];
    owners = territoryOwnership(scenario.runs, resolution, settings["territory.growth"]);
    territoryHexes = owners.size;
    setLabData(map, LAB_SOURCES.territory, territoryFeatures(owners, scenario.players));
    const runs = runFeatures(scenario.runs, scenario.players, resolution);
    setLabData(map, LAB_SOURCES.runLines, runs.lines);
    setLabData(map, LAB_SOURCES.runCells, runs.cells);
    const trade = tradeRouteFeatures(scenario.tradeRoutes, resolution);
    setLabData(map, LAB_SOURCES.tradeLines, trade.lines);
    setLabData(map, LAB_SOURCES.tradeCells, trade.cells);
  };

  const rebuildGrid = (): void => {
    const hexesVisible = map.getZoom() >= hexFade().start;
    const grid = hexesVisible ? gridFeatures(paddedBounds(map), settings["hexGrid.resolution"], MAX_GRID_CELLS) : undefined;
    setLabData(map, LAB_SOURCES.grid, grid ?? featureCollection([]));
  };

  const reportInfo = (): void => {
    const resolution = settings["hexGrid.resolution"];
    onInfo({
      players: scenario.players.length,
      runs: scenario.runs.length,
      tradeRoutes: scenario.tradeRoutes.length,
      territoryHexes,
      hexEdgeMeters: getHexagonEdgeLengthAvg(resolution, "m"),
      hexAreaSquareMeters: getHexagonAreaAvg(resolution, "km2") * SQUARE_METERS_PER_SQUARE_KILOMETER,
      roadsMissing: roadLines.length === 0,
      hexFade: hexFade(),
      territories: territorySizes(owners, scenario.players),
    });
  };

  const animatePackets = (time: number): void => {
    if (settings["tradeRoutes.enabled"] && settings["tradeRoutes.packets"]) {
      const travelled = (time / MILLISECONDS_PER_SECOND) * PACKET_METERS_PER_SECOND * settings["tradeRoutes.packetSpeed"];
      setLabData(map, LAB_SOURCES.packets, featureCollection(packetRoutes.flatMap((route) => packetFeatures(route, travelled))));
    }
    window.requestAnimationFrame(animatePackets);
  };

  rebuildScenario();
  rebuildHexData();
  rebuildGrid();
  applyLabSettings(map, settings, baseLayerIds, hexFade());
  reportInfo();
  map.on("moveend", rebuildGrid);
  window.requestAnimationFrame(animatePackets);

  return {
    update(next, changedKey) {
      settings = next;
      const scenarioChanged = changedKey === undefined || changedKey.startsWith("scenario.");
      if (scenarioChanged) rebuildScenario();
      if (scenarioChanged || (changedKey !== undefined && HEX_DATA_KEYS.has(changedKey))) rebuildHexData();
      if (changedKey === undefined || GRID_KEYS.has(changedKey)) rebuildGrid();
      applyLabSettings(map, settings, baseLayerIds, hexFade());
      reportInfo();
    },
    mapCenter() {
      const { lng, lat } = map.getCenter();
      return [lng, lat];
    },
  };
}

function paddedBounds(map: MapLibreMap): Bounds {
  const [west, south, east, north] = map.getBounds().toArray().flat() as Bounds;
  const padLongitude = (east - west) * GRID_PADDING_FACTOR;
  const padLatitude = (north - south) * GRID_PADDING_FACTOR;
  return [west - padLongitude, south - padLatitude, east + padLongitude, north + padLatitude];
}

async function loadWalkableRoads(url: string): Promise<LngLat[][]> {
  try {
    const response = await fetch(url);
    if (!response.ok) return [];
    const collection = (await response.json()) as {
      features?: { geometry?: { type?: string; coordinates?: LngLat[] }; properties?: { kind?: string } }[];
    };
    return (collection.features ?? [])
      .filter((feature) => feature.geometry?.type === "LineString" && !EXCLUDED_ROAD_KINDS.has(feature.properties?.kind ?? ""))
      .map((feature) => feature.geometry?.coordinates ?? []);
  } catch {
    return [];
  }
}

function toPacketRoute(route: TradeRoute): PacketRoute {
  const cumulative = cumulativeDistances(route.path);
  return {
    path: route.path,
    cumulative,
    length: cumulative[cumulative.length - 1] ?? 0,
    share: route.bandwidthShare,
    packets: 1 + Math.round(route.bandwidthShare * (MAX_PACKETS_PER_ROUTE - 1)),
  };
}

function packetFeatures(route: PacketRoute, travelled: number): LabFeature[] {
  if (route.length === 0) return [];
  const spacing = route.length / route.packets;
  return Array.from({ length: route.packets }, (_, index) => ({
    type: "Feature",
    geometry: {
      type: "Point",
      coordinates: pointAlongPath(route.path, route.cumulative, (travelled + index * spacing) % route.length),
    },
    properties: { share: route.share },
  }));
}
