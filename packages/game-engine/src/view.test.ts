import { describe, expect, test } from "bun:test";
import { eventsOfType, play, scenario } from "./testing";
import { createMechView } from "./view";

describe("mech view (hidden information)", () => {
  test("starts with all four enemy attributes unknown", () => {
    const view = createMechView(scenario(), "A");
    expect(view).toEqual({
      side: "A",
      round: 1,
      initiative: view.initiative,
      own: { profileId: "BRAWLER", hp: 220, maxHp: 220, energy: 100 },
      enemy: { hp: 180, energy: 100 },
      distance: 60,
      distanceCategory: "LONG",
      knownEnemyAttributes: [],
      unknownEnemyAttributes: ["MELEE_WEAPON", "RANGED_WEAPON", "ARMOR_CLASS", "MOBILITY"],
      enemyActions: [],
    });
  });

  test("using a weapon reveals the action but not the weapon", () => {
    const { state } = play(scenario(), ["DEFEND", "DEFEND"], ["RANGED_ATTACK", "RETREAT"]);
    const view = createMechView(state, "A");
    expect(view.enemyActions.map((a) => a.action)).toEqual(["RANGED_ATTACK", "RETREAT"]);
    expect(view.knownEnemyAttributes).toEqual([]);
    expect(JSON.stringify(view)).not.toContain("PULSE_LASER");
  });

  test("scanned attributes stay known and only for the scanning mech", () => {
    const { state, events } = play(scenario(), ["SCAN", "DEFEND"], ["DEFEND", "DEFEND"]);
    const scanned = eventsOfType(events, "SCAN_COMPLETED")[0]!;
    const next = play(state, ["DEFEND", "DEFEND"], ["DEFEND", "DEFEND"]).state;

    const viewA = createMechView(next, "A");
    expect(viewA.knownEnemyAttributes).toEqual([{ attribute: scanned.attribute, value: scanned.value } as never]);
    expect(viewA.unknownEnemyAttributes).not.toContain(scanned.attribute);
    expect(createMechView(next, "B").knownEnemyAttributes).toEqual([]);
  });

  test("failed enemy actions are visible with their reason", () => {
    const { state } = play(scenario(), ["DEFEND", "DEFEND"], ["MELEE_ATTACK", "DEFEND"]);
    expect(createMechView(state, "A").enemyActions[0]).toMatchObject({
      action: "MELEE_ATTACK",
      failure: "TARGET_OUT_OF_RANGE",
    });
  });
});
