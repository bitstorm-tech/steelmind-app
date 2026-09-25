import { describe, expect, test } from "bun:test";
import { createRng } from "./rng";

describe("seeded RNG", () => {
  test("same seed yields the same sequence", () => {
    const draw = (seed: number) => {
      const rng = createRng(seed);
      return Array.from({ length: 20 }, () => rng.int(100));
    };
    expect(draw(99)).toEqual(draw(99));
    expect(draw(99)).not.toEqual(draw(100));
  });

  test("resuming from a saved state continues the sequence", () => {
    const rng = createRng(7);
    rng.int(10);
    const resumed = createRng(rng.state());
    expect(resumed.int(1000)).toBe(rng.int(1000));
  });

  test("values stay within [0, max)", () => {
    const rng = createRng(1);
    for (let i = 0; i < 1000; i++) {
      const value = rng.int(4);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(4);
    }
  });
});
