// Combat Profile data for the selection screen.
// Combat values are from SPEC.md §31–§35 (MVP Combat Profiles, Mobility,
// Armor, Weapons). Mass values are flavor/presentation only — the MVP has no
// weight calculations (SPEC §3).

export type ProfileId = "BRAWLER" | "ASSAULT" | "SKIRMISHER";
export type ArmorClass = "LIGHT" | "MEDIUM" | "HEAVY";
export type MobilityClass = "LOW" | "MEDIUM" | "HIGH";

export interface WeaponSpec {
  name: string;
  damage: number;
  energy: number;
  rangeLabel: string;
}

export interface CombatProfileSpec {
  id: ProfileId;
  designation: string;
  name: string;
  role: string;
  doctrine: string;
  massTons: number;
  hp: number;
  armor: ArmorClass;
  armorReductionPct: number;
  mobility: MobilityClass;
  advanceMeters: number;
  chargeMeters: number;
  melee: WeaponSpec;
  ranged: WeaponSpec;
  accent: string;
}

export const COMBAT_PROFILES: CombatProfileSpec[] = [
  {
    id: "BRAWLER",
    designation: "CDP-01",
    name: "Brawler",
    role: "Heavy Line-Breaker",
    doctrine: "Walk in. Close the gap. End it with the hammer.",
    massTons: 85,
    hp: 220,
    armor: "HEAVY",
    armorReductionPct: 12,
    mobility: "LOW",
    advanceMeters: 8,
    chargeMeters: 20,
    melee: { name: "Power Hammer", damage: 28, energy: 16, rangeLabel: "CLOSE" },
    ranged: { name: "Autocannon", damage: 16, energy: 10, rangeLabel: "> 10 m" },
    accent: "#e25837",
  },
  {
    id: "ASSAULT",
    designation: "CDP-02",
    name: "Assault",
    role: "Balanced Gunline",
    doctrine: "Hold the mid-range. Make every railgun shot count.",
    massTons: 70,
    hp: 200,
    armor: "MEDIUM",
    armorReductionPct: 6,
    mobility: "MEDIUM",
    advanceMeters: 10,
    chargeMeters: 25,
    melee: { name: "Energy Blade", damage: 24, energy: 12, rangeLabel: "CLOSE" },
    ranged: { name: "Railgun", damage: 20, energy: 16, rangeLabel: "> 10 m" },
    accent: "#ffb020",
  },
  {
    id: "SKIRMISHER",
    designation: "CDP-03",
    name: "Skirmisher",
    role: "Light Raider",
    doctrine: "Stay fast, stay unknown. Bleed them at range.",
    massTons: 55,
    hp: 180,
    armor: "LIGHT",
    armorReductionPct: 0,
    mobility: "HIGH",
    advanceMeters: 12,
    chargeMeters: 30,
    melee: { name: "Impact Fist", damage: 20, energy: 8, rangeLabel: "CLOSE" },
    ranged: { name: "Pulse Laser", damage: 13, energy: 7, rangeLabel: "> 10 m" },
    accent: "#45c4cf",
  },
];

export const ARMOR_PIPS: Record<ArmorClass, number> = {
  LIGHT: 1,
  MEDIUM: 2,
  HEAVY: 3,
};

export const MOBILITY_PIPS: Record<MobilityClass, number> = {
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
};
