import { describe, expect, test } from "bun:test";
import { getDistance, getDistanceCategory } from "./arena";
import { calculateDamage, createMatch, resolveRound } from "./match";
import { eventsOfType, play, scenario } from "./testing";

describe("match setup", () => {
  test("mechs start at 30 m and 90 m with full HP and Energy", () => {
    const { state, events } = createMatch({ seed: 1, profiles: { A: "BRAWLER", B: "SKIRMISHER" } });
    expect(state.mechs.A).toMatchObject({ position: 30, hp: 220, energy: 100 });
    expect(state.mechs.B).toMatchObject({ position: 90, hp: 180, energy: 100 });
    expect(getDistance(state)).toBe(60);
    expect(state.round).toBe(0);
    expect(events[0]?.type).toBe("MATCH_STARTED");
  });

  test("initial Initiative comes from the seed", () => {
    const initiativeFor = (seed: number) =>
      createMatch({ seed, profiles: { A: "ASSAULT", B: "ASSAULT" } }).state.initiative;
    expect(initiativeFor(42)).toBe(initiativeFor(42));
    const all = new Set(Array.from({ length: 20 }, (_, seed) => initiativeFor(seed)));
    expect(all).toEqual(new Set(["A", "B"]));
  });
});

describe("distance", () => {
  test("categories use the SPEC §12 boundaries", () => {
    expect(getDistanceCategory(0)).toBe("CLOSE");
    expect(getDistanceCategory(10)).toBe("CLOSE");
    expect(getDistanceCategory(11)).toBe("MEDIUM");
    expect(getDistanceCategory(30)).toBe("MEDIUM");
    expect(getDistanceCategory(31)).toBe("LONG");
  });
});

describe("initiative and sequencing", () => {
  test("the Initiative owner acts first in each slot", () => {
    const order = (initiative: "A" | "B") =>
      eventsOfType(play(scenario({ initiative }), ["DEFEND", "DEFEND"], ["DEFEND", "DEFEND"]).events, "ACTION_STARTED")
        .map((e) => `${e.side}${e.slot}`);
    expect(order("A")).toEqual(["A1", "B1", "A2", "B2"]);
    expect(order("B")).toEqual(["B1", "A1", "B2", "A2"]);
  });

  test("Initiative alternates every round", () => {
    let state = scenario({ initiative: "A" });
    const owners: string[] = [];
    for (let i = 0; i < 4; i++) {
      const step = play(state, ["DEFEND", "DEFEND"], ["DEFEND", "DEFEND"]);
      owners.push(eventsOfType(step.events, "ROUND_STARTED")[0]!.initiative);
      state = step.state;
    }
    expect(owners).toEqual(["A", "B", "A", "B"]);
  });

  test("a planned action can become impossible before it executes", () => {
    // Distance 8: the Brawler plans two melee attacks, the Skirmisher retreats twice.
    const state = scenario({ initiative: "A", positions: [50, 58] });
    const { state: after, events } = play(state, ["MELEE_ATTACK", "MELEE_ATTACK"], ["RETREAT", "RETREAT"]);
    expect(eventsOfType(events, "ATTACK_HIT")).toHaveLength(1);
    expect(eventsOfType(events, "ACTION_FAILED")).toEqual([
      { type: "ACTION_FAILED", round: 1, side: "A", slot: 2, action: "MELEE_ATTACK", reason: "TARGET_OUT_OF_RANGE" },
    ]);
    // Only the executed hammer blow costs Energy.
    expect(after.mechs.A.energy).toBe(100 - 16);
    expect(after.actionLog.map((e) => e.failure)).toEqual([null, null, "TARGET_OUT_OF_RANGE", null]);
  });

  test("resolveRound does not modify its input state", () => {
    const state = scenario();
    const snapshot = structuredClone(state);
    play(state, ["ADVANCE", "ADVANCE"], ["SCAN", "DODGE"]);
    expect(state).toEqual(snapshot);
  });
});

describe("ADVANCE and RETREAT", () => {
  test("ADVANCE moves by the profile's mobility", () => {
    const { state } = play(scenario(), ["ADVANCE", "DEFEND"], ["ADVANCE", "DEFEND"]);
    expect(state.mechs.A.position).toBe(38); // LOW: 8 m
    expect(state.mechs.B.position).toBe(78); // HIGH: 12 m
  });

  test("movement stops face to face instead of passing through", () => {
    const { state, events } = play(scenario({ initiative: "A", positions: [50, 55] }), ["ADVANCE", "ADVANCE"], ["ADVANCE", "DEFEND"]);
    expect(state.mechs.A.position).toBe(55);
    expect(state.mechs.B.position).toBe(55);
    expect(getDistance(state)).toBe(0);
    expect(eventsOfType(events, "ACTION_FAILED")).toHaveLength(0);
  });

  test("RETREAT moves away from the opponent", () => {
    const { state } = play(scenario(), ["RETREAT", "DEFEND"], ["RETREAT", "DEFEND"]);
    expect(state.mechs.A.position).toBe(22);
    expect(state.mechs.B.position).toBe(102);
  });

  test("RETREAT is clamped at the boundary, then fails at it", () => {
    const { state, events } = play(scenario({ positions: [5, 116] }), ["RETREAT", "RETREAT"], ["RETREAT", "RETREAT"]);
    expect(state.mechs.A.position).toBe(0);
    expect(state.mechs.B.position).toBe(120);
    const failures = eventsOfType(events, "ACTION_FAILED");
    expect(failures.map((f) => [f.side, f.slot, f.reason])).toEqual(
      expect.arrayContaining([
        ["A", 2, "ARENA_BOUNDARY"],
        ["B", 2, "ARENA_BOUNDARY"],
      ]),
    );
    expect(failures).toHaveLength(2);
  });
});

describe("CHARGE and ENGAGED", () => {
  test("a CHARGE that falls short moves 2.5 × mobility and engages nobody", () => {
    const { state, events } = play(scenario({ initiative: "A" }), ["CHARGE", "DEFEND"], ["DEFEND", "DEFEND"]);
    expect(state.mechs.A.position).toBe(50);
    expect(state.mechs.A.energy).toBe(100 - 20 - 4);
    expect(eventsOfType(events, "CHARGE_CONNECTED")).toHaveLength(0);
  });

  test("a connecting CHARGE pins the target for the rest of the round", () => {
    const state = scenario({ initiative: "A", positions: [50, 70] });
    const { state: after, events } = play(state, ["CHARGE", "RETREAT"], ["RETREAT", "ADVANCE"]);
    expect(eventsOfType(events, "CHARGE_CONNECTED")).toEqual([
      { type: "CHARGE_CONNECTED", round: 1, side: "A", target: "B" },
    ]);
    expect(eventsOfType(events, "MECH_ENGAGED")).toEqual([{ type: "MECH_ENGAGED", round: 1, side: "B" }]);
    const failures = eventsOfType(events, "ACTION_FAILED");
    expect(failures.map((f) => [f.side, f.action, f.reason])).toEqual([
      ["B", "RETREAT", "ENGAGED"],
      ["B", "ADVANCE", "ENGAGED"],
    ]);
    // The charger is never pinned and may still retreat.
    expect(after.mechs.A.position).toBe(62);
    // CHARGE itself deals no damage.
    expect(eventsOfType(events, "DAMAGE_TAKEN")).toHaveLength(0);
  });

  test("ENGAGED allows attacks and wears off before the next round", () => {
    const state = scenario({ initiative: "A", positions: [50, 70] });
    const first = play(state, ["CHARGE", "DEFEND"], ["MELEE_ATTACK", "DEFEND"]);
    expect(eventsOfType(first.events, "ATTACK_HIT").map((e) => e.side)).toEqual(["B"]);
    expect(first.state.mechs.B.engaged).toBe(false);
    const second = play(first.state, ["DEFEND", "DEFEND"], ["RETREAT", "DEFEND"]);
    expect(eventsOfType(second.events, "ACTION_FAILED")).toHaveLength(0);
  });

  test("CHARGE from DISTANCE 0 connects immediately", () => {
    const { events } = play(scenario({ initiative: "A", positions: [60, 60] }), ["CHARGE", "DEFEND"], ["DEFEND", "DEFEND"]);
    expect(eventsOfType(events, "CHARGE_CONNECTED")).toHaveLength(1);
  });

  test("CHARGE without enough Energy fails and costs nothing", () => {
    const { state, events } = play(scenario({ energy: [5, 100] }), ["CHARGE", "DEFEND"], ["DEFEND", "DEFEND"]);
    expect(eventsOfType(events, "ACTION_FAILED")[0]).toMatchObject({ side: "A", reason: "INSUFFICIENT_ENERGY" });
    expect(state.mechs.A.position).toBe(30);
    expect(state.mechs.A.energy).toBe(15 - 4);
  });
});

describe("attack range", () => {
  test("melee hits at 10 m and fails at 11 m", () => {
    const at = (distance: number) =>
      eventsOfType(play(scenario({ positions: [50, 50 + distance] }), ["MELEE_ATTACK", "DEFEND"], ["DEFEND", "DEFEND"]).events, "ACTION_FAILED");
    expect(at(10)).toHaveLength(0);
    expect(at(11)[0]).toMatchObject({ action: "MELEE_ATTACK", reason: "TARGET_OUT_OF_RANGE" });
  });

  test("ranged hits at 11 m and fails at 10 m without spending Energy", () => {
    const at = (distance: number) =>
      play(scenario({ positions: [50, 50 + distance] }), ["RANGED_ATTACK", "DEFEND"], ["DEFEND", "DEFEND"]);
    expect(eventsOfType(at(11).events, "ATTACK_HIT")).toHaveLength(1);
    const close = at(10);
    expect(eventsOfType(close.events, "ACTION_FAILED")[0]).toMatchObject({ reason: "TARGET_OUT_OF_RANGE" });
    expect(close.state.mechs.A.energy).toBe(100 - 4);
  });
});

describe("damage", () => {
  test("reductions are multiplicative and rounded to the nearest integer", () => {
    expect(calculateDamage(24, 10, 25)).toBe(16); // SPEC §26 example
    expect(calculateDamage(20, 12, 0)).toBe(18); // 17.6
    expect(calculateDamage(28, 6, 50)).toBe(13); // 13.16
  });

  test("passive armor reduces incoming damage", () => {
    // Assault railgun (20) into Brawler heavy armor (12 %).
    const state = scenario({ initiative: "A", profiles: { A: "ASSAULT", B: "BRAWLER" } });
    const { state: after, events } = play(state, ["RANGED_ATTACK", "DEFEND"], ["DEFEND", "DEFEND"]);
    expect(eventsOfType(events, "ATTACK_HIT")[0]).toMatchObject({ armorReductionPct: 12, damage: 18 });
    expect(after.mechs.B.hp).toBe(220 - 18);
  });

  test("DEFEND stacks within a round and resets afterwards", () => {
    // B (Assault, 6 % armor) defends twice while the Brawler hammers after each DEFEND.
    const state = scenario({ initiative: "B", positions: [50, 55], profiles: { A: "BRAWLER", B: "ASSAULT" } });
    const { state: after, events } = play(state, ["MELEE_ATTACK", "MELEE_ATTACK"], ["DEFEND", "DEFEND"]);
    expect(eventsOfType(events, "DEFEND_ACTIVATED").map((e) => e.defendReductionPct)).toEqual([25, 50]);
    expect(eventsOfType(events, "ATTACK_HIT").map((e) => [e.defendReductionPct, e.damage])).toEqual([
      [25, 20],
      [50, 13],
    ]);
    expect(after.mechs.B.defendStacks).toBe(0);
  });
});

describe("DODGE", () => {
  test("DODGE stacks per round", () => {
    const { state, events } = play(scenario(), ["DODGE", "DODGE"], ["DEFEND", "DEFEND"]);
    expect(eventsOfType(events, "DODGE_ACTIVATED").map((e) => [e.rangedDodgePct, e.meleeDodgePct])).toEqual([
      [15, 20],
      [30, 40],
    ]);
    expect(state.mechs.A.dodgeStacks).toBe(0);
  });

  test("dodge rolls are seeded and roughly match the dodge chance", () => {
    const dodged = (seed: number) => {
      const state = scenario({ seed, initiative: "B", positions: [50, 55] });
      const { events } = play(state, ["DEFEND", "MELEE_ATTACK"], ["DODGE", "DODGE"]);
      return eventsOfType(events, "ATTACK_DODGED").length === 1;
    };
    const outcomes = Array.from({ length: 400 }, (_, seed) => dodged(seed));
    expect(outcomes).toEqual(Array.from({ length: 400 }, (_, seed) => dodged(seed)));
    const rate = outcomes.filter(Boolean).length / outcomes.length;
    expect(rate).toBeGreaterThan(0.3); // melee dodge chance is 40 %
    expect(rate).toBeLessThan(0.5);
  });

  test("a dodged attack deals no damage but still costs Energy", () => {
    for (let seed = 0; seed < 50; seed++) {
      const state = scenario({ seed, initiative: "B", positions: [50, 55] });
      const { state: after, events } = play(state, ["DEFEND", "MELEE_ATTACK"], ["DODGE", "DODGE"]);
      if (eventsOfType(events, "ATTACK_DODGED").length === 0) continue;
      expect(after.mechs.B.hp).toBe(180);
      expect(after.mechs.A.energy).toBe(100 - 4 - 16);
      return;
    }
    throw new Error("no dodge in 50 seeds");
  });
});

describe("Energy", () => {
  test("regenerates 10 per round up to the maximum of 100", () => {
    const { state, events } = play(scenario({ energy: [95, 40] }), ["DEFEND", "DEFEND"], ["DEFEND", "DEFEND"]);
    expect(eventsOfType(events, "ENERGY_REGENERATED").map((e) => [e.side, e.amount, e.energy])).toEqual([
      ["A", 5, 100],
      ["B", 10, 50],
    ]);
    expect(state.mechs.A.energy).toBe(92);
    expect(state.mechs.B.energy).toBe(42);
  });

  test("insufficient Energy fails any costly action and consumes nothing", () => {
    const { state, events } = play(scenario({ energy: [0, 100], positions: [50, 55] }), ["MELEE_ATTACK", "SCAN"], ["DEFEND", "DEFEND"]);
    // 10 regenerated Energy cannot pay for the 16-Energy hammer, but can pay for SCAN.
    expect(eventsOfType(events, "ACTION_FAILED").map((e) => e.reason)).toEqual(["INSUFFICIENT_ENERGY"]);
    expect(state.mechs.A.energy).toBe(0);
    expect(state.mechs.B.hp).toBe(180);
  });
});

describe("SCAN", () => {
  test("reveals a unique unknown attribute per scan until none remain", () => {
    let state = scenario({ profiles: { A: "ASSAULT", B: "BRAWLER" } });
    const revealed: string[] = [];
    for (let i = 0; i < 2; i++) {
      const step = play(state, ["SCAN", "SCAN"], ["DEFEND", "DEFEND"]);
      revealed.push(...eventsOfType(step.events, "SCAN_COMPLETED").map((e) => `${e.attribute}=${e.value}`));
      state = step.state;
    }
    expect(revealed.sort()).toEqual([
      "ARMOR_CLASS=HEAVY",
      "MELEE_WEAPON=POWER_HAMMER",
      "MOBILITY=LOW",
      "RANGED_WEAPON=AUTOCANNON",
    ]);

    const energyBefore = state.mechs.A.energy;
    const exhausted = play(state, ["SCAN", "DEFEND"], ["DEFEND", "DEFEND"]);
    expect(eventsOfType(exhausted.events, "ACTION_FAILED")[0]).toMatchObject({ reason: "NOTHING_LEFT_TO_SCAN" });
    expect(exhausted.state.mechs.A.energy).toBe(energyBefore + 10 - 4);
  });

  test("the scanned attribute is chosen by the seeded RNG", () => {
    const firstScan = (seed: number) =>
      eventsOfType(play(scenario({ seed }), ["SCAN", "DEFEND"], ["DEFEND", "DEFEND"]).events, "SCAN_COMPLETED")[0]!.attribute;
    expect(firstScan(3)).toBe(firstScan(3));
    const seen = new Set(Array.from({ length: 40 }, (_, seed) => firstScan(seed)));
    expect(seen.size).toBe(4);
  });
});

describe("destruction and match end", () => {
  test("a destroyed mech still executes its remaining actions", () => {
    const state = scenario({ initiative: "A", positions: [50, 55], hp: [220, 10] });
    const { state: after, events } = play(state, ["MELEE_ATTACK", "DEFEND"], ["MELEE_ATTACK", "MELEE_ATTACK"]);
    expect(eventsOfType(events, "ATTACK_HIT").map((e) => e.side)).toEqual(["A", "B", "B"]);
    expect(after.mechs.A.hp).toBe(220 - 18 - 13); // Impact Fist 20 into 12 % armor, then with DEFEND
    expect(eventsOfType(events, "MECH_DESTROYED")).toEqual([{ type: "MECH_DESTROYED", round: 1, side: "B" }]);
    expect(after.result).toEqual({ winner: "A", reason: "DESTRUCTION", round: 1 });
    expect(events.at(-1)).toEqual({ type: "MATCH_COMPLETED", result: after.result! });
  });

  test("both mechs at 0 HP after a round is a DRAW", () => {
    const state = scenario({ initiative: "A", positions: [50, 55], hp: [5, 5] });
    const { state: after } = play(state, ["MELEE_ATTACK", "DEFEND"], ["MELEE_ATTACK", "DEFEND"]);
    expect(after.result).toEqual({ winner: null, reason: "DOUBLE_KO", round: 1 });
  });

  test("no further rounds can be resolved after the match ended", () => {
    const state = scenario({ positions: [50, 55], hp: [220, 1] });
    const { state: after } = play(state, ["MELEE_ATTACK", "DEFEND"], ["DEFEND", "DEFEND"]);
    expect(() => resolveRound(after, { A: ["DEFEND", "DEFEND"], B: ["DEFEND", "DEFEND"] })).toThrow();
  });

  test("after round 30 the higher HP wins", () => {
    const { state } = play(scenario({ round: 29, hp: [100, 120] }), ["DEFEND", "DEFEND"], ["DEFEND", "DEFEND"]);
    expect(state.result).toEqual({ winner: "B", reason: "ROUND_LIMIT_HP", round: 30 });
  });

  test("equal HP after round 30 falls back to Energy", () => {
    const { state } = play(scenario({ round: 29, hp: [100, 100] }), ["DEFEND", "DEFEND"], ["DODGE", "DEFEND"]);
    expect(state.result).toEqual({ winner: "A", reason: "ROUND_LIMIT_ENERGY", round: 30 });
  });

  test("equal HP and Energy after round 30 is a DRAW", () => {
    const { state } = play(scenario({ round: 29, hp: [100, 100] }), ["DEFEND", "DEFEND"], ["DEFEND", "DEFEND"]);
    expect(state.result).toEqual({ winner: null, reason: "ROUND_LIMIT_DRAW", round: 30 });
  });

  test("the match continues before round 30", () => {
    const { state } = play(scenario({ round: 28, hp: [100, 120] }), ["DEFEND", "DEFEND"], ["DEFEND", "DEFEND"]);
    expect(state.result).toBeNull();
  });
});
