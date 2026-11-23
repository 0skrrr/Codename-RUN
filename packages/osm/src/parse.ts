import { SaxesParser, type SaxesTagPlain } from "saxes";
import type { OsmData, OsmMember, OsmMemberType, OsmNode, OsmRelation, OsmWay } from "./types.ts";

type PendingElement =
  | { kind: "node"; id: number; lat: number; lon: number; tags: Record<string, string> }
  | { kind: "way"; id: number; nodeIds: number[]; tags: Record<string, string> }
  | { kind: "relation"; id: number; members: OsmMember[]; tags: Record<string, string> };

const MEMBER_TYPES: ReadonlySet<string> = new Set<OsmMemberType>(["node", "way", "relation"]);
const ELEMENT_TAGS: ReadonlySet<string> = new Set(["node", "way", "relation"]);

export async function parseOsm(chunks: AsyncIterable<string> | Iterable<string>): Promise<OsmData> {
  const nodes = new Map<number, OsmNode>();
  const ways = new Map<number, OsmWay>();
  const relations = new Map<number, OsmRelation>();
  const parser = new SaxesParser();
  let pending: PendingElement | undefined;
  let parseError: Error | undefined;

  parser.on("error", (error) => {
    parseError ??= error;
  });

  parser.on("opentag", (tag) => {
    const opened = openElement(tag);
    if (opened) {
      pending = opened;
      return;
    }
    if (pending) addChild(pending, tag);
  });

  parser.on("closetag", (tag) => {
    if (!pending || !ELEMENT_TAGS.has(tag.name)) return;
    commit(pending, nodes, ways, relations);
    pending = undefined;
  });

  for await (const chunk of chunks) {
    parser.write(chunk);
    if (parseError) throw parseError;
  }
  parser.close();
  if (parseError) throw parseError;

  return { nodes, ways, relations };
}

function openElement(tag: SaxesTagPlain): PendingElement | undefined {
  const { name, attributes } = tag;
  const id = Number(attributes.id);
  if (name === "node") {
    return { kind: "node", id, lat: Number(attributes.lat), lon: Number(attributes.lon), tags: {} };
  }
  if (name === "way") return { kind: "way", id, nodeIds: [], tags: {} };
  if (name === "relation") return { kind: "relation", id, members: [], tags: {} };
  return undefined;
}

function addChild(pending: PendingElement, tag: SaxesTagPlain): void {
  const { name, attributes } = tag;
  if (name === "tag" && attributes.k !== undefined) {
    pending.tags[attributes.k] = attributes.v ?? "";
    return;
  }
  if (name === "nd" && pending.kind === "way") {
    pending.nodeIds.push(Number(attributes.ref));
    return;
  }
  if (name === "member" && pending.kind === "relation" && MEMBER_TYPES.has(attributes.type ?? "")) {
    pending.members.push({
      type: attributes.type as OsmMemberType,
      ref: Number(attributes.ref),
      role: attributes.role ?? "",
    });
  }
}

function commit(
  pending: PendingElement,
  nodes: Map<number, OsmNode>,
  ways: Map<number, OsmWay>,
  relations: Map<number, OsmRelation>,
): void {
  if (pending.kind === "node") {
    nodes.set(pending.id, { id: pending.id, lat: pending.lat, lon: pending.lon, tags: pending.tags });
    return;
  }
  if (pending.kind === "way") {
    ways.set(pending.id, { id: pending.id, nodeIds: pending.nodeIds, tags: pending.tags });
    return;
  }
  relations.set(pending.id, { id: pending.id, members: pending.members, tags: pending.tags });
}
