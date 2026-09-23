import { describe, expect, test } from "vitest";
import {
  DIRECTIVE_LIMITS,
  STARTER_BRAINS,
  conditionSourceHasUnit,
  conditionSourceIsHp,
  formatCondition,
  formatTrigger,
} from "./brains";
import type { TriggerCondition, TriggerOperator } from "./brains";
import { directiveHasKeyword, extractKeywords } from "./keywords";

const OPERATORS: readonly TriggerOperator[] = ["<", "<=", "=", ">=", ">", "!="];

// Toughest chassis carries 220 HP (SPEC §31), max Energy is 100.
const MAX_ABSOLUTE_HP = 220;
const MAX_ABSOLUTE_ENERGY = 100;

function expectValidCondition(condition: TriggerCondition): void {
  expect(OPERATORS).toContain(condition.operator);

  if (conditionSourceHasUnit(condition.source)) {
    expect(condition.unit === "absolute" || condition.unit === "percent").toBe(true);
    expect(typeof condition.value).toBe("number");

    const value = condition.value as number;
    if (condition.unit === "percent") {
      expect(value).toBeGreaterThanOrEqual(1);
      expect(value).toBeLessThanOrEqual(100);
    } else {
      expect(value).toBeGreaterThanOrEqual(1);
      expect(value).toBeLessThanOrEqual(
        conditionSourceIsHp(condition.source) ? MAX_ABSOLUTE_HP : MAX_ABSOLUTE_ENERGY,
      );
    }
  } else {
    expect(condition.unit).toBeUndefined();
    expect(condition.value === "" || condition.value === 0).toBe(false);
  }
}

describe("starter brains", () => {
  test("contains exactly the five SPEC §52 starter archetypes", () => {
    expect(STARTER_BRAINS.map((b) => b.id)).toEqual([
      "BERSERKER",
      "SENTINEL",
      "OPPORTUNIST",
      "TECHNICIAN",
      "TRICKSTER",
    ]);
  });

  test("ids, designations and names are unique", () => {
    const ids = new Set(STARTER_BRAINS.map((b) => b.id));
    const designations = new Set(STARTER_BRAINS.map((b) => b.designation));
    const names = new Set(STARTER_BRAINS.map((b) => b.name));
    expect(ids.size).toBe(STARTER_BRAINS.length);
    expect(designations.size).toBe(STARTER_BRAINS.length);
    expect(names.size).toBe(STARTER_BRAINS.length);
  });

  test("has exactly three trigger slots and one emergency protocol (§42)", () => {
    for (const brain of STARTER_BRAINS) {
      expect(brain.triggerSlots).toHaveLength(3);
      expect(brain.emergency.hpThresholdPercent).toBeGreaterThan(0);
      expect(brain.emergency.hpThresholdPercent).toBeLessThan(100);
    }
  });

  test("directives respect the §49 prompt length limits", () => {
    for (const brain of STARTER_BRAINS) {
      expect(brain.coreDirective.length).toBeLessThanOrEqual(DIRECTIVE_LIMITS.core);
      expect(brain.openingDirective.length).toBeLessThanOrEqual(DIRECTIVE_LIMITS.opening);
      expect(brain.emergency.directive.length).toBeLessThanOrEqual(
        DIRECTIVE_LIMITS.emergency,
      );
      for (const slot of brain.triggerSlots) {
        expect(slot.directive.length).toBeLessThanOrEqual(DIRECTIVE_LIMITS.trigger);
      }
    }
  });

  test("every directive references at least one gameplay keyword (§50, §51)", () => {
    for (const brain of STARTER_BRAINS) {
      expect(directiveHasKeyword(brain.coreDirective)).toBe(true);
      expect(directiveHasKeyword(brain.openingDirective)).toBe(true);
      expect(directiveHasKeyword(brain.emergency.directive)).toBe(true);
      for (const slot of brain.triggerSlots) {
        expect(directiveHasKeyword(slot.directive)).toBe(true);
      }
    }
  });

  test("trigger conditions are valid UI configuration (§45, §46)", () => {
    for (const brain of STARTER_BRAINS) {
      for (const slot of brain.triggerSlots) {
        expectValidCondition(slot.condition);
      }
    }
  });

  test("archetypes read as intended (aggressive, defensive, ...)", () => {
    const byId = new Map(STARTER_BRAINS.map((b) => [b.id, b]));

    // BERSERKER opens with CHARGE and hunts melee.
    const berserker = byId.get("BERSERKER")!;
    expect(extractKeywords(berserker.coreDirective)).toContain("CHARGE");
    expect(extractKeywords(berserker.openingDirective)).toContain("CHARGE");

    // SENTINEL prefers DEFEND and avoids early aggression.
    const sentinel = byId.get("SENTINEL")!;
    expect(extractKeywords(sentinel.coreDirective)).toContain("DEFEND");
    expect(extractKeywords(sentinel.openingDirective)).toContain("SCAN");

    // TECHNICIAN scans before fighting.
    const technician = byId.get("TECHNICIAN")!;
    expect(extractKeywords(technician.coreDirective)).toContain("SCAN");
    expect(technician.triggerSlots[0]!.condition.source).toBe("UNKNOWN_MELEE_WEAPON");

    // TRICKSTER mixes evasion with sudden bursts.
    const trickster = byId.get("TRICKSTER")!;
    expect(extractKeywords(trickster.coreDirective)).toContain("DODGE");
  });

  test("formats conditions canonically", () => {
    expect(
      formatCondition({ source: "OWN_HP", operator: "<", value: 25, unit: "percent" }),
    ).toBe("OWN HP < 25%");
    expect(
      formatCondition({ source: "OWN_ENERGY", operator: ">=", value: 20, unit: "absolute" }),
    ).toBe("OWN ENERGY >= 20");
    expect(
      formatCondition({ source: "ENEMY_HP", operator: ">", value: 50, unit: "percent" }),
    ).toBe("ENEMY HP > 50%");
    expect(
      formatCondition({ source: "ENEMY_ENERGY", operator: "<", value: 40, unit: "percent" }),
    ).toBe("ENEMY ENERGY < 40%");
    expect(formatCondition({ source: "DISTANCE", operator: "<=", value: 10 })).toBe(
      "DISTANCE <= 10 m",
    );
    expect(
      formatCondition({ source: "DISTANCE_CATEGORY", operator: "!=", value: "CLOSE" }),
    ).toBe("DISTANCE_CATEGORY != CLOSE");
    expect(formatCondition({ source: "CURRENT_ROUND", operator: "<=", value: 3 })).toBe(
      "ROUND <= 3",
    );
    expect(formatCondition({ source: "INITIATIVE", operator: "=", value: "OWN" })).toBe(
      "INITIATIVE = OWN",
    );
    expect(
      formatCondition({ source: "PREVIOUS_ENEMY_ACTION", operator: "=", value: "CHARGE" }),
    ).toBe("ENEMY LAST ACTION = CHARGE");
    expect(
      formatCondition({ source: "UNKNOWN_MELEE_WEAPON", operator: "=", value: "TRUE" }),
    ).toBe("MELEE_WEAPON UNKNOWN");
    expect(
      formatCondition({ source: "KNOWN_ARMOR_CLASS", operator: "=", value: "TRUE" }),
    ).toBe("ARMOR_CLASS KNOWN");
  });

  test("formats trigger slots as WHEN … → …", () => {
    const berserker = STARTER_BRAINS[0]!;
    expect(formatTrigger(berserker.triggerSlots[0]!)).toBe(
      "WHEN OWN ENERGY >= 20 → CHARGE the enemy and finish with MELEE_ATTACK.",
    );
  });
});
