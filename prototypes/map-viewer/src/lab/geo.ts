export type LngLat = [longitude: number, latitude: number];

export type LabGeometry =
  | { type: "Point"; coordinates: LngLat }
  | { type: "LineString"; coordinates: LngLat[] }
  | { type: "Polygon"; coordinates: LngLat[][] }
  | { type: "MultiPolygon"; coordinates: LngLat[][][] };

export interface LabFeature {
  type: "Feature";
  geometry: LabGeometry;
  properties: Record<string, string | number>;
}

export interface LabFeatureCollection {
  type: "FeatureCollection";
  features: LabFeature[];
}

const EARTH_RADIUS_METERS = 6_371_008.8;
const DEGREES_TO_RADIANS = Math.PI / 180;

export function featureCollection(features: LabFeature[]): LabFeatureCollection {
  return { type: "FeatureCollection", features };
}

export function distanceMeters([lng1, lat1]: LngLat, [lng2, lat2]: LngLat): number {
  const phi1 = lat1 * DEGREES_TO_RADIANS;
  const phi2 = lat2 * DEGREES_TO_RADIANS;
  const deltaPhi = (lat2 - lat1) * DEGREES_TO_RADIANS;
  const deltaLambda = (lng2 - lng1) * DEGREES_TO_RADIANS;
  const a = Math.sin(deltaPhi / 2) ** 2 + Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) ** 2;
  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.sqrt(a));
}

export function cumulativeDistances(path: readonly LngLat[]): number[] {
  const distances = [0];
  for (let index = 1; index < path.length; index++) {
    const previous = distances[index - 1] ?? 0;
    distances.push(previous + distanceMeters(path[index - 1] as LngLat, path[index] as LngLat));
  }
  return distances;
}

export function pointAlongPath(path: readonly LngLat[], cumulative: readonly number[], distance: number): LngLat {
  const total = cumulative[cumulative.length - 1] ?? 0;
  const target = Math.min(Math.max(distance, 0), total);
  let index = 1;
  while (index < cumulative.length - 1 && (cumulative[index] ?? 0) < target) index++;
  const start = path[index - 1] as LngLat;
  const end = path[index] ?? start;
  const segmentStart = cumulative[index - 1] ?? 0;
  const segmentLength = (cumulative[index] ?? segmentStart) - segmentStart;
  const fraction = segmentLength > 0 ? (target - segmentStart) / segmentLength : 0;
  return [start[0] + (end[0] - start[0]) * fraction, start[1] + (end[1] - start[1]) * fraction];
}
