import "maplibre-gl/dist/maplibre-gl.css";
import "./styles.css";
import {
  Map as MapLibreMap,
  NavigationControl,
  ScaleControl,
  setWorkerUrl,
  type MapMouseEvent,
  type MapOptions,
} from "maplibre-gl";
import mapLibreWorkerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?url";
import {
  DATA_LAYER_NAMES,
  datasetNameFromUrl,
  layerUrl,
  loadManifest,
  type DataLayerName,
  type DatasetManifest,
} from "./dataset.ts";
import { currentLanguage, t } from "./i18n.ts";
import { BASE_STYLE, sourceId, STYLE_LAYERS } from "./mapStyle.ts";
import { createLab, type LabController } from "./lab/labController.ts";
import { createLabPanel } from "./lab/labPanel.ts";
import { loadLastUsedSettings, saveLastUsedSettings } from "./lab/presetStorage.ts";
import { DEFAULT_SETTINGS, type SettingKey, type Settings } from "./lab/settings.ts";
import { createPanel, type InspectedFeature, type Panel } from "./panel.ts";

const MAP_PADDING_PX = 24;
const MAX_ZOOM = 19;
const LAB_START_ZOOM = 13.5;
const BASE_LAYER_IDS = Object.values(STYLE_LAYERS).flatMap((layers) => layers.map((layer) => layer.id));

setWorkerUrl(mapLibreWorkerUrl);
document.title = t("mapViewer.pageTitle");
document.documentElement.lang = currentLanguage;

const panel = createPanel(requiredElement("panel"));
panel.showStatus(t("mapViewer.loading"));

const dataset = datasetNameFromUrl(window.location.search);
loadManifest(dataset)
  .then((manifest) => {
    if (manifest) {
      showMap(manifest, panel);
      return;
    }
    panel.showStatus(t("mapViewer.loadError", { name: dataset }));
  })
  .catch(() => panel.showStatus(t("mapViewer.loadError", { name: dataset })));

function showMap(manifest: DatasetManifest, sidePanel: Panel): void {
  const initialSettings = loadLastUsedSettings();
  const labCenter: [number, number] = [initialSettings["scenario.centerLongitude"], initialSettings["scenario.centerLatitude"]];
  const viewFromLink = window.location.hash.length > 1;
  const startAtLab = !viewFromLink && isInside(labCenter, manifest.bounds);
  const map = new MapLibreMap({
    container: requiredElement("map"),
    style: BASE_STYLE,
    maxZoom: MAX_ZOOM,
    hash: true,
    pitch: initialSettings["view.pitch"],
    ...startPosition(viewFromLink, startAtLab, labCenter, manifest.bounds),
  });
  map.addControl(new NavigationControl(), "top-right");
  map.addControl(new ScaleControl({ unit: "metric" }), "bottom-right");

  map.on("load", () => {
    for (const layer of manifest.layers) {
      map.addSource(sourceId(layer.name), { type: "geojson", data: layerUrl(manifest.name, layer) });
      for (const styleLayer of STYLE_LAYERS[layer.name]) map.addLayer(styleLayer);
    }
    sidePanel.showLayers(manifest, (layer, visible) => setLayerVisibility(map, layer, visible));
    const roads = manifest.layers.find((layer) => layer.name === "roads");
    void startLab(map, roads ? layerUrl(manifest.name, roads) : undefined, initialSettings);
  });

  map.on("click", (event: MapMouseEvent) => sidePanel.showFeature(inspectAt(map, event)));
}

async function startLab(map: MapLibreMap, roadsUrl: string | undefined, initialSettings: Settings): Promise<void> {
  let settings = initialSettings;
  let lab: LabController | undefined;
  const labPanel = createLabPanel(requiredElement("panel"), {
    onChange(key, value) {
      apply({ ...settings, [key]: value }, key);
    },
    onReplace(next) {
      apply(next);
      labPanel.render(settings);
    },
    onReset() {
      apply({ ...DEFAULT_SETTINGS });
      labPanel.render(settings);
    },
    onRegenerateHere() {
      const [longitude, latitude] = lab?.mapCenter() ?? [settings["scenario.centerLongitude"], settings["scenario.centerLatitude"]];
      apply({ ...settings, "scenario.centerLongitude": longitude, "scenario.centerLatitude": latitude }, "scenario.centerLongitude");
    },
  });
  const apply = (next: Settings, changedKey?: SettingKey): void => {
    settings = next;
    saveLastUsedSettings(settings);
    lab?.update(settings, changedKey);
  };
  labPanel.render(settings);
  lab = await createLab(map, roadsUrl, settings, BASE_LAYER_IDS, (info) => labPanel.showInfo(info));
}

function startPosition(
  viewFromLink: boolean,
  startAtLab: boolean,
  labCenter: [number, number],
  bounds: DatasetManifest["bounds"],
): Partial<MapOptions> {
  if (viewFromLink) return {};
  if (startAtLab) return { center: labCenter, zoom: LAB_START_ZOOM };
  return { bounds, fitBoundsOptions: { padding: MAP_PADDING_PX } };
}

function isInside([longitude, latitude]: [number, number], [west, south, east, north]: DatasetManifest["bounds"]): boolean {
  return longitude >= west && longitude <= east && latitude >= south && latitude <= north;
}

function setLayerVisibility(map: MapLibreMap, layer: DataLayerName, visible: boolean): void {
  for (const styleLayer of STYLE_LAYERS[layer]) {
    map.setLayoutProperty(styleLayer.id, "visibility", visible ? "visible" : "none");
  }
}

function inspectAt(map: MapLibreMap, event: MapMouseEvent): InspectedFeature | undefined {
  const baseSources = new Set(DATA_LAYER_NAMES.map(sourceId));
  const feature = map.queryRenderedFeatures(event.point).find((candidate) => baseSources.has(candidate.source));
  const layer = DATA_LAYER_NAMES.find((name) => feature?.source === sourceId(name));
  if (!feature || !layer) return undefined;
  const { kind, name } = feature.properties as { kind?: string; name?: string };
  return { layer, kind: kind ?? "", name };
}

function requiredElement(id: string): HTMLElement {
  const found = document.getElementById(id);
  if (!found) throw new Error(`Missing #${id} element in index.html`);
  return found;
}
