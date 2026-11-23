export type NodeIdPath = readonly number[];

export function isClosedPath(path: NodeIdPath): boolean {
  return path.length >= 4 && path[0] === path[path.length - 1];
}

export function joinIntoRings(paths: readonly NodeIdPath[]): number[][] {
  const remaining = paths.filter((path) => path.length >= 2).map((path) => [...path]);
  const rings: number[][] = [];

  while (remaining.length > 0) {
    const ring = remaining.pop() as number[];
    while (!isClosedPath(ring)) {
      const extended = extendWithMatchingPath(ring, remaining);
      if (!extended) break;
    }
    if (isClosedPath(ring)) rings.push(ring);
  }

  return rings;
}

function extendWithMatchingPath(ring: number[], candidates: number[][]): boolean {
  const end = ring[ring.length - 1];
  const index = candidates.findIndex((path) => path[0] === end || path[path.length - 1] === end);
  if (index === -1) return false;

  const [match] = candidates.splice(index, 1) as [number[]];
  const oriented = match[0] === end ? match : [...match].reverse();
  ring.push(...oriented.slice(1));
  return true;
}
