export type Position = [longitude: number, latitude: number];

export type Geometry =
  | { type: "LineString"; coordinates: Position[] }
  | { type: "MultiLineString"; coordinates: Position[][] }
  | { type: "Polygon"; coordinates: Position[][] }
  | { type: "MultiPolygon"; coordinates: Position[][][] };

export interface Feature {
  type: "Feature";
  id: string;
  geometry: Geometry;
  properties: Record<string, string>;
}

export interface FeatureCollection {
  type: "FeatureCollection";
  features: Feature[];
}

export type BoundingBox = [west: number, south: number, east: number, north: number];
