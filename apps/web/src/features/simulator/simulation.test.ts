import { runMatch, SCRIPTED_PLANNERS } from "@steelmind/game-engine";
import { describe, expect, test } from "vitest";
import { STARTER_BRAINS } from "../brain-selection/brains";
import { BRAIN_PLANNERS, buildLog, runSimulation, type SimulationSetup } from "./simulation";

const SETUP: SimulationSetup = {
  seed: 7,
  loadouts: {
    A: { brainId: "BERSERKER", profileId: "BRAWLER" },
    B: { brainId: "TECHNICIAN", profileId: "SKIRMISHER" },
  },
};

describe("runSimulation", () => {
  test("every starter brain has a scripted stand-in", () => {
    for (const brain of STARTER_BRAINS) {
      expect(SCRIPTED_PLANNERS[BRAIN_PLANNERS[brain.id]]).toBeTypeOf("function");
    }
  });

  test("groups a finished match into rounds of four actions", () => {
    const log = runSimulation(SETUP);

    expect(log.seed).toBe(7);
    expect(log.rounds.length).toBe(log.result.round);
    expect(log.start.A.profileId).toBe("BRAWLER");
    expect(log.start.B.profileId).toBe("SKIRMISHER");
    for (const round of log.rounds) {
      expect(round.actions).toHaveLength(4);
      expect(round.actions.map((a) => a.side)[0]).toBe(round.initiative);
      expect(round.distance).toBe(round.mechs.B.position - round.mechs.A.position);
    }
  });

  test("is deterministic for identical setups", () => {
    expect(runSimulation(SETUP)).toEqual(runSimulation(SETUP));
  });

  test("matches the engine's final state", () => {
    const { state } = runMatch(
      { seed: 7, profiles: { A: "BRAWLER", B: "SKIRMISHER" } },
      { A: SCRIPTED_PLANNERS.brawler, B: SCRIPTED_PLANNERS.kiter },
    );
    const last = runSimulation(SETUP).rounds.at(-1)!;

    expect(last.mechs.A.hp).toBe(state.mechs.A.hp);
    expect(last.mechs.B.hp).toBe(state.mechs.B.hp);
    expect(last.destroyed.length > 0).toBe(state.result?.reason === "DESTRUCTION" || state.result?.reason === "DOUBLE_KO");
  });

  test("collects hits, scans, failures and energy per action", () => {
    const actions = runSimulation(SETUP).rounds.flatMap((r) => r.actions);

    const hit = actions.find((a) => a.details.some((d) => d.tone === "hit" && d.text.startsWith("Hit")));
    expect(hit?.weapon).toBeTruthy();
    expect(hit?.energySpent).toBeGreaterThan(0);

    const scan = actions.find((a) => a.action === "SCAN" && a.failure === null);
    expect(scan?.details[0]?.tone).toBe("scan");
    expect(scan?.details[0]?.text).toMatch(/^Revealed /);
    expect(scan?.energySpent).toBe(10);

    for (const failed of actions.filter((a) => a.failure !== null)) {
      expect(failed.energySpent).toBe(0);
    }
  });

  test("rejects an incomplete event stream", () => {
    const { events } = runMatch(
      { seed: 1, profiles: { A: "BRAWLER", B: "BRAWLER" } },
      { A: SCRIPTED_PLANNERS.brawler, B: SCRIPTED_PLANNERS.brawler },
    );
    expect(() => buildLog(events.slice(0, -1))).toThrow();
  });
});
