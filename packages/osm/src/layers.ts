import {
  classifyArea,
  classifyBoundary,
  classifyLine,
  LAYER_NAMES,
  type Classification,
  type LayerName,
} from "./classify.ts";
import type { BoundingBox, Feature, FeatureCollection, Geometry, Position } from "./geojson.ts";
import { isClosedPath, joinIntoRings, type NodeIdPath } from "./rings.ts";
import type { OsmData, OsmNode, OsmRelation, OsmWay } from "./types.ts";

export type MapLayers = Record<LayerName, FeatureCollection>;

const COORDINATE_PRECISION = 1e6;
const OUTER_ROLES: ReadonlySet<string> = new Set(["outer", ""]);
const INNER_ROLE = "inner";

export function buildLayers(data: OsmData): MapLayers {
  const layers = emptyLayers();

  for (const way of data.ways.values()) {
    const feature = wayToFeature(way, data.nodes);
    if (feature) layers[feature.layer].features.push(feature.feature);
  }

  for (const relation of data.relations.values()) {
    const feature = relationToFeature(relation, data);
    if (feature) layers[feature.layer].features.push(feature.feature);
  }

  return layers;
}

export function layersBoundingBox(layers: MapLayers): BoundingBox | undefined {
  const box: BoundingBox = [Infinity, Infinity, -Infinity, -Infinity];
  for (const name of LAYER_NAMES) {
    for (const feature of layers[name].features) {
      for (const [longitude, latitude] of allPositions(feature.geometry)) {
        box[0] = Math.min(box[0], longitude);
        box[1] = Math.min(box[1], latitude);
        box[2] = Math.max(box[2], longitude);
        box[3] = Math.max(box[3], latitude);
      }
    }
  }
  return Number.isFinite(box[0]) ? box : undefined;
}

interface LayeredFeature {
  layer: LayerName;
  feature: Feature;
}

function emptyLayers(): MapLayers {
  const layers: Partial<MapLayers> = {};
  for (const name of LAYER_NAMES) layers[name] = { type: "FeatureCollection", features: [] };
  return layers as MapLayers;
}

function wayToFeature(way: OsmWay, nodes: ReadonlyMap<number, OsmNode>): LayeredFeature | undefined {
  const area = isClosedPath(way.nodeIds) ? classifyArea(way.tags) : undefined;
  const classification = area ?? classifyLine(way.tags);
  if (!classification) return undefined;

  const coordinates = toPositions(way.nodeIds, nodes);
  if (!coordinates) return undefined;

  const geometry: Geometry = area
    ? { type: "Polygon", coordinates: [coordinates] }
    : { type: "LineString", coordinates };
  return layered(classification, `w${way.id}`, geometry, way.tags.name);
}

function relationToFeature(relation: OsmRelation, data: OsmData): LayeredFeature | undefined {
  if (relation.tags.type === "multipolygon") {
    const classification = classifyArea(relation.tags);
    const geometry = classification && multipolygonGeometry(relation, data);
    return geometry ? layered(classification, `r${relation.id}`, geometry, relation.tags.name) : undefined;
  }

  const boundary = classifyBoundary(relation.tags);
  if (!boundary) return undefined;
  const lines = memberWayPaths(relation, data.ways, OUTER_ROLES)
    .map((path) => toPositions(path, data.nodes))
    .filter((line): line is Position[] => line !== undefined);
  if (lines.length === 0) return undefined;
  return layered(boundary, `r${relation.id}`, { type: "MultiLineString", coordinates: lines }, relation.tags.name);
}

function multipolygonGeometry(relation: OsmRelation, data: OsmData): Geometry | undefined {
  const outers = ringsToPositions(joinIntoRings(memberWayPaths(relation, data.ways, OUTER_ROLES)), data.nodes);
  if (outers.length === 0) return undefined;
  const inners = ringsToPositions(
    joinIntoRings(memberWayPaths(relation, data.ways, new Set([INNER_ROLE]))),
    data.nodes,
  );

  const polygons = outers.map((outer) => [
    outer,
    ...inners.filter((inner) => inner[0] !== undefined && ringContains(outer, inner[0])),
  ]);
  return { type: "MultiPolygon", coordinates: polygons };
}

function memberWayPaths(
  relation: OsmRelation,
  ways: ReadonlyMap<number, OsmWay>,
  roles: ReadonlySet<string>,
): NodeIdPath[] {
  return relation.members
    .filter((member) => member.type === "way" && roles.has(member.role))
    .map((member) => ways.get(member.ref)?.nodeIds)
    .filter((path): path is NodeIdPath => path !== undefined);
}

function ringsToPositions(rings: readonly NodeIdPath[], nodes: ReadonlyMap<number, OsmNode>): Position[][] {
  return rings
    .map((ring) => toPositions(ring, nodes))
    .filter((ring): ring is Position[] => ring !== undefined);
}

function toPositions(nodeIds: NodeIdPath, nodes: ReadonlyMap<number, OsmNode>): Position[] | undefined {
  const positions: Position[] = [];
  for (const id of nodeIds) {
    const node = nodes.get(id);
    if (!node) return undefined;
    positions.push([roundCoordinate(node.lon), roundCoordinate(node.lat)]);
  }
  return positions.length >= 2 ? positions : undefined;
}

function roundCoordinate(value: number): number {
  return Math.round(value * COORDINATE_PRECISION) / COORDINATE_PRECISION;
}

function ringContains(ring: readonly Position[], [x, y]: Position): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i] as Position;
    const [xj, yj] = ring[j] as Position;
    const crosses = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (crosses) inside = !inside;
  }
  return inside;
}

function layered(
  classification: Classification,
  id: string,
  geometry: Geometry,
  name: string | undefined,
): LayeredFeature {
  const properties: Record<string, string> = { kind: classification.kind };
  if (name !== undefined) properties.name = name;
  return { layer: classification.layer, feature: { type: "Feature", id, geometry, properties } };
}

function allPositions(geometry: Geometry): Position[] {
  if (geometry.type === "LineString") return geometry.coordinates;
  if (geometry.type === "MultiPolygon") return geometry.coordinates.flat(2);
  return geometry.coordinates.flat();
}
