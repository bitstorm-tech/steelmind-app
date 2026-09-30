import {
  ARMOR_REDUCTION_PCT,
  COMBAT_PROFILES as ENGINE_PROFILES,
  MELEE_WEAPONS,
  MOBILITY_METERS,
  RANGED_WEAPONS,
  type ArmorClass,
  type MeleeWeaponId,
  type MobilityClass,
  type ProfileId,
  type RangedWeaponId,
} from "@steelmind/game-types";

// Combat Profile data for the selection screen. Combat values come from the
// shared balancing constants in @steelmind/game-types (SPEC §31–§35); this
// file only adds presentation. Mass values are flavor only — the MVP has no
// weight calculations (SPEC §3).

export type { ArmorClass, MobilityClass, ProfileId };

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

export const MELEE_NAMES: Record<MeleeWeaponId, string> = {
  POWER_HAMMER: "Power Hammer",
  ENERGY_BLADE: "Energy Blade",
  IMPACT_FIST: "Impact Fist",
};

export const RANGED_NAMES: Record<RangedWeaponId, string> = {
  AUTOCANNON: "Autocannon",
  RAILGUN: "Railgun",
  PULSE_LASER: "Pulse Laser",
};

type Presentation = Pick<
  CombatProfileSpec,
  "id" | "designation" | "name" | "role" | "doctrine" | "massTons" | "accent"
>;

function withCombatValues(presentation: Presentation): CombatProfileSpec {
  const profile = ENGINE_PROFILES[presentation.id];
  const mobility = MOBILITY_METERS[profile.mobility];
  return {
    ...presentation,
    hp: profile.hp,
    armor: profile.armor,
    armorReductionPct: ARMOR_REDUCTION_PCT[profile.armor],
    mobility: profile.mobility,
    advanceMeters: mobility.advance,
    chargeMeters: mobility.charge,
    melee: { name: MELEE_NAMES[profile.meleeWeapon], ...MELEE_WEAPONS[profile.meleeWeapon], rangeLabel: "CLOSE" },
    ranged: { name: RANGED_NAMES[profile.rangedWeapon], ...RANGED_WEAPONS[profile.rangedWeapon], rangeLabel: "> 10 m" },
  };
}

const PRESENTATION: Presentation[] = [
  {
    id: "BRAWLER",
    designation: "CDP-01",
    name: "Brawler",
    role: "Heavy Line-Breaker",
    doctrine: "Walk in. Close the gap. End it with the hammer.",
    massTons: 85,
    accent: "#e25837",
  },
  {
    id: "ASSAULT",
    designation: "CDP-02",
    name: "Assault",
    role: "Balanced Gunline",
    doctrine: "Hold the mid-range. Make every railgun shot count.",
    massTons: 70,
    accent: "#ffb020",
  },
  {
    id: "SKIRMISHER",
    designation: "CDP-03",
    name: "Skirmisher",
    role: "Light Raider",
    doctrine: "Stay fast, stay unknown. Bleed them at range.",
    massTons: 55,
    accent: "#45c4cf",
  },
];

export const COMBAT_PROFILES: CombatProfileSpec[] = PRESENTATION.map(withCombatValues);

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
