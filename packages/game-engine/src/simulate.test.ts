import { describe, expect, test } from "bun:test";
import { ActionPlanSchema, MAX_ROUNDS, PROFILE_IDS } from "@steelmind/game-types";
import { brawlerPlanner, kiterPlanner, runMatch, SCRIPTED_PLANNERS, type Planner } from "./simulate";

describe("runMatch", () => {
  // Milestone 1 acceptance: two scripted mechs complete a deterministic fight
  // of at most 30 rounds entirely inside the Game Engine.
  test("scripted mechs always finish within the round limit", () => {
    for (const a of PROFILE_IDS) {
      for (const b of PROFILE_IDS) {
        for (let seed = 0; seed < 10; seed++) {
          const { state, events } = runMatch({ seed, profiles: { A: a, B: b } }, { A: brawlerPlanner, B: kiterPlanner });
          expect(state.result).not.toBeNull();
          expect(state.round).toBeLessThanOrEqual(MAX_ROUNDS);
          expect(events.at(-1)?.type).toBe("MATCH_COMPLETED");
        }
      }
    }
  });

  test("identical seed and plans reproduce the identical fight", () => {
    const setup = { seed: 1234, profiles: { A: "SKIRMISHER", B: "ASSAULT" } } as const;
    const planners = { A: kiterPlanner, B: brawlerPlanner };
    expect(runMatch(setup, planners)).toEqual(runMatch(setup, planners));
  });

  test("different seeds can produce different fights", () => {
    const run = (seed: number) =>
      JSON.stringify(runMatch({ seed, profiles: { A: "BRAWLER", B: "SKIRMISHER" } }, { A: brawlerPlanner, B: kiterPlanner }).events.slice(1));
    const distinct = new Set(Array.from({ length: 10 }, (_, seed) => run(seed)));
    expect(distinct.size).toBeGreaterThan(1);
  });

  test("every scripted planner pairing finishes with valid plans", () => {
    const planners = Object.values(SCRIPTED_PLANNERS);
    const checked = (planner: Planner): Planner => (view) => ActionPlanSchema.parse(planner(view));
    for (const a of planners) {
      for (const b of planners) {
        for (let seed = 0; seed < 3; seed++) {
          const { state } = runMatch({ seed, profiles: { A: "ASSAULT", B: "SKIRMISHER" } }, { A: checked(a), B: checked(b) });
          expect(state.result).not.toBeNull();
          expect(state.round).toBeLessThanOrEqual(MAX_ROUNDS);
        }
      }
    }
  });
});
