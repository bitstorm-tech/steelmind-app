import { describe, expect, test } from "vitest";
import { ARMOR_PIPS, COMBAT_PROFILES, MOBILITY_PIPS } from "./profiles";

describe("combat profiles", () => {
  test("contains exactly the three MVP profiles", () => {
    expect(COMBAT_PROFILES.map((p) => p.id)).toEqual([
      "BRAWLER",
      "ASSAULT",
      "SKIRMISHER",
    ]);
  });

  test("matches SPEC §31 values", () => {
    const byId = new Map(COMBAT_PROFILES.map((p) => [p.id, p]));

    const brawler = byId.get("BRAWLER")!;
    expect(brawler.hp).toBe(220);
    expect(brawler.armor).toBe("HEAVY");
    expect(brawler.mobility).toBe("LOW");
    expect(brawler.melee.name).toBe("Power Hammer");
    expect(brawler.ranged.name).toBe("Autocannon");

    const assault = byId.get("ASSAULT")!;
    expect(assault.hp).toBe(200);
    expect(assault.armor).toBe("MEDIUM");
    expect(assault.mobility).toBe("MEDIUM");
    expect(assault.melee.name).toBe("Energy Blade");
    expect(assault.ranged.name).toBe("Railgun");

    const skirmisher = byId.get("SKIRMISHER")!;
    expect(skirmisher.hp).toBe(180);
    expect(skirmisher.armor).toBe("LIGHT");
    expect(skirmisher.mobility).toBe("HIGH");
    expect(skirmisher.melee.name).toBe("Impact Fist");
    expect(skirmisher.ranged.name).toBe("Pulse Laser");
  });

  test("matches SPEC §32 mobility values", () => {
    const byId = new Map(COMBAT_PROFILES.map((p) => [p.id, p]));
    expect(byId.get("BRAWLER")).toMatchObject({ advanceMeters: 8, chargeMeters: 20 });
    expect(byId.get("ASSAULT")).toMatchObject({ advanceMeters: 10, chargeMeters: 25 });
    expect(byId.get("SKIRMISHER")).toMatchObject({ advanceMeters: 12, chargeMeters: 30 });
  });

  test("matches SPEC §33 armor reduction", () => {
    const byId = new Map(COMBAT_PROFILES.map((p) => [p.id, p]));
    expect(byId.get("BRAWLER")!.armorReductionPct).toBe(12);
    expect(byId.get("ASSAULT")!.armorReductionPct).toBe(6);
    expect(byId.get("SKIRMISHER")!.armorReductionPct).toBe(0);
  });

  test("matches SPEC §34/§35 weapon values", () => {
    const byId = new Map(COMBAT_PROFILES.map((p) => [p.id, p]));

    expect(byId.get("BRAWLER")!.melee).toMatchObject({ damage: 28, energy: 16 });
    expect(byId.get("BRAWLER")!.ranged).toMatchObject({ damage: 16, energy: 10 });
    expect(byId.get("ASSAULT")!.melee).toMatchObject({ damage: 24, energy: 12 });
    expect(byId.get("ASSAULT")!.ranged).toMatchObject({ damage: 20, energy: 16 });
    expect(byId.get("SKIRMISHER")!.melee).toMatchObject({ damage: 20, energy: 8 });
    expect(byId.get("SKIRMISHER")!.ranged).toMatchObject({ damage: 13, energy: 7 });
  });

  test("pips encode class intensity", () => {
    expect(ARMOR_PIPS).toEqual({ LIGHT: 1, MEDIUM: 2, HEAVY: 3 });
    expect(MOBILITY_PIPS).toEqual({ LOW: 1, MEDIUM: 2, HIGH: 3 });
  });
});
