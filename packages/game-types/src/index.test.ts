import { describe, expect, test } from "bun:test";
import {
  ActionPlanSchema,
  ARMOR_REDUCTION_PCT,
  COMBAT_PROFILES,
  MELEE_WEAPONS,
  MOBILITY_METERS,
  RANGED_WEAPONS,
} from "./index";

describe("ActionPlanSchema", () => {
  test("accepts exactly two known actions", () => {
    expect(ActionPlanSchema.parse(["CHARGE", "MELEE_ATTACK"])).toEqual(["CHARGE", "MELEE_ATTACK"]);
  });

  test("rejects unknown actions and wrong counts", () => {
    expect(ActionPlanSchema.safeParse(["FLY", "DEFEND"]).success).toBe(false);
    expect(ActionPlanSchema.safeParse(["DEFEND"]).success).toBe(false);
    expect(ActionPlanSchema.safeParse(["DEFEND", "DEFEND", "DEFEND"]).success).toBe(false);
  });
});

describe("balancing constants", () => {
  test("combat profiles match SPEC §31", () => {
    expect(COMBAT_PROFILES.BRAWLER).toMatchObject({
      hp: 220,
      armor: "HEAVY",
      mobility: "LOW",
      meleeWeapon: "POWER_HAMMER",
      rangedWeapon: "AUTOCANNON",
    });
    expect(COMBAT_PROFILES.ASSAULT).toMatchObject({
      hp: 200,
      armor: "MEDIUM",
      mobility: "MEDIUM",
      meleeWeapon: "ENERGY_BLADE",
      rangedWeapon: "RAILGUN",
    });
    expect(COMBAT_PROFILES.SKIRMISHER).toMatchObject({
      hp: 180,
      armor: "LIGHT",
      mobility: "HIGH",
      meleeWeapon: "IMPACT_FIST",
      rangedWeapon: "PULSE_LASER",
    });
  });

  test("CHARGE covers 2.5 × normal movement (SPEC §20)", () => {
    for (const { advance, charge } of Object.values(MOBILITY_METERS)) {
      expect(charge).toBe(advance * 2.5);
    }
  });

  test("armor and weapons match SPEC §33–§35", () => {
    expect(ARMOR_REDUCTION_PCT).toEqual({ LIGHT: 0, MEDIUM: 6, HEAVY: 12 });
    expect(MELEE_WEAPONS.POWER_HAMMER).toEqual({ damage: 28, energy: 16 });
    expect(RANGED_WEAPONS.PULSE_LASER).toEqual({ damage: 13, energy: 7 });
  });
});
