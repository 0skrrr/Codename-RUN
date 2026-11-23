const UINT32_RANGE = 4_294_967_296;

export type Random = () => number;

export function seededRandom(seed: number): Random {
  let state = Math.trunc(seed) >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let mixed = state;
    mixed = Math.imul(mixed ^ (mixed >>> 15), mixed | 1);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
    return ((mixed ^ (mixed >>> 14)) >>> 0) / UINT32_RANGE;
  };
}

export function pickIndex(random: Random, length: number): number {
  return Math.floor(random() * length);
}
