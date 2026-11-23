export const DATA_LAYER_NAMES = [
  "landcover",
  "water",
  "waterways",
  "railways",
  "roads",
  "buildings",
  "boundaries",
] as const;

export type DataLayerName = (typeof DATA_LAYER_NAMES)[number];

export interface DatasetLayer {
  name: DataLayerName;
  file: string;
  featureCount: number;
}

export interface DatasetManifest {
  name: string;
  bounds: [west: number, south: number, east: number, north: number];
  layers: DatasetLayer[];
}

const DEFAULT_DATASET = "zlin-district";
const DATASET_NAME_PATTERN = /^[a-z0-9-]+$/;

export function datasetNameFromUrl(search: string): string {
  const requested = new URLSearchParams(search).get("dataset");
  return requested !== null && DATASET_NAME_PATTERN.test(requested) ? requested : DEFAULT_DATASET;
}

export function layerUrl(dataset: string, layer: DatasetLayer): string {
  return `/${dataset}/${layer.file}`;
}

export async function loadManifest(dataset: string): Promise<DatasetManifest | undefined> {
  const response = await fetch(`/${dataset}/manifest.json`);
  if (!response.ok) return undefined;
  const body: unknown = await response.json().catch(() => undefined);
  return isManifest(body) ? body : undefined;
}

function isManifest(value: unknown): value is DatasetManifest {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Partial<DatasetManifest>;
  const hasBounds = Array.isArray(candidate.bounds) && candidate.bounds.length === 4;
  const hasLayers =
    Array.isArray(candidate.layers) &&
    candidate.layers.every((layer) => (DATA_LAYER_NAMES as readonly string[]).includes(layer.name));
  return typeof candidate.name === "string" && hasBounds && hasLayers;
}
