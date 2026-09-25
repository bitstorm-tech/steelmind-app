import type {
  Action,
  ArmorClass,
  CombatProfile,
  MeleeWeaponId,
  MobilityClass,
  ProfileId,
  RangedWeaponId,
  WeaponStats,
} from "./combat";

// Centralized balancing constants (SPEC §17). Game logic reads every tunable
// number from here — never inline it.

export const ARENA_LENGTH_METERS = 120;
export const STARTING_POSITIONS = { A: 30, B: 90 } as const;

export const MAX_ROUNDS = 30;

export const MAX_ENERGY = 100;
export const STARTING_ENERGY = 100;
export const ENERGY_REGEN_PER_ROUND = 10;

// Distance categories (SPEC §12): CLOSE <= 10 m, MEDIUM <= 30 m, LONG beyond.
export const CLOSE_MAX_METERS = 10;
export const MEDIUM_MAX_METERS = 30;

// Melee needs DISTANCE <= 10 m, ranged needs DISTANCE > 10 m (SPEC §22–§23).
export const MELEE_MAX_RANGE_METERS = CLOSE_MAX_METERS;

// Fixed action costs; attacks cost what the equipped weapon costs.
export const ACTION_ENERGY_COST = {
  ADVANCE: 0,
  RETREAT: 0,
  CHARGE: 20,
  DEFEND: 4,
  DODGE: 6,
  SCAN: 10,
} as const satisfies Partial<Record<Action, number>>;

export const DEFEND_REDUCTION_PCT = 25;
export const DODGE_CHANCE_PCT = { RANGED: 15, MELEE: 20 } as const;

export const MOBILITY_METERS: Record<MobilityClass, { advance: number; charge: number }> = {
  LOW: { advance: 8, charge: 20 },
  MEDIUM: { advance: 10, charge: 25 },
  HIGH: { advance: 12, charge: 30 },
};

export const ARMOR_REDUCTION_PCT: Record<ArmorClass, number> = {
  LIGHT: 0,
  MEDIUM: 6,
  HEAVY: 12,
};

export const MELEE_WEAPONS: Record<MeleeWeaponId, WeaponStats> = {
  POWER_HAMMER: { damage: 28, energy: 16 },
  ENERGY_BLADE: { damage: 24, energy: 12 },
  IMPACT_FIST: { damage: 20, energy: 8 },
};

export const RANGED_WEAPONS: Record<RangedWeaponId, WeaponStats> = {
  AUTOCANNON: { damage: 16, energy: 10 },
  RAILGUN: { damage: 20, energy: 16 },
  PULSE_LASER: { damage: 13, energy: 7 },
};

export const COMBAT_PROFILES: Record<ProfileId, CombatProfile> = {
  BRAWLER: {
    id: "BRAWLER",
    hp: 220,
    armor: "HEAVY",
    mobility: "LOW",
    meleeWeapon: "POWER_HAMMER",
    rangedWeapon: "AUTOCANNON",
  },
  ASSAULT: {
    id: "ASSAULT",
    hp: 200,
    armor: "MEDIUM",
    mobility: "MEDIUM",
    meleeWeapon: "ENERGY_BLADE",
    rangedWeapon: "RAILGUN",
  },
  SKIRMISHER: {
    id: "SKIRMISHER",
    hp: 180,
    armor: "LIGHT",
    mobility: "HIGH",
    meleeWeapon: "IMPACT_FIST",
    rangedWeapon: "PULSE_LASER",
  },
};

// Used when a Brain produces no valid output after all retries (SPEC §39).
export const FALLBACK_ACTION_PLAN = ["DEFEND", "DEFEND"] as const satisfies readonly [Action, Action];
