// Seeded PRNG (mulberry32). The whole generator state is one uint32 so it can
// live inside GameState and make every round reproducible (SPEC §59).

export interface Rng {
  // Uniform integer in [0, maxExclusive).
  int(maxExclusive: number): number;
  state(): number;
}

export function normalizeSeed(seed: number): number {
  return seed >>> 0;
}

export function createRng(state: number): Rng {
  let s = normalizeSeed(state);
  return {
    int(maxExclusive) {
      s = (s + 0x6d2b79f5) >>> 0;
      let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      const unit = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      return Math.floor(unit * maxExclusive);
    },
    state() {
      return s;
    },
  };
}
