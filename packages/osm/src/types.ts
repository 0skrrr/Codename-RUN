export type Tags = Readonly<Record<string, string>>;

export interface OsmNode {
  readonly id: number;
  readonly lat: number;
  readonly lon: number;
  readonly tags: Tags;
}

export interface OsmWay {
  readonly id: number;
  readonly nodeIds: readonly number[];
  readonly tags: Tags;
}

export type OsmMemberType = "node" | "way" | "relation";

export interface OsmMember {
  readonly type: OsmMemberType;
  readonly ref: number;
  readonly role: string;
}

export interface OsmRelation {
  readonly id: number;
  readonly members: readonly OsmMember[];
  readonly tags: Tags;
}

export interface OsmData {
  readonly nodes: ReadonlyMap<number, OsmNode>;
  readonly ways: ReadonlyMap<number, OsmWay>;
  readonly relations: ReadonlyMap<number, OsmRelation>;
}
