import { z } from "zod";

// Combat vocabulary: actions, profiles, equipment and hidden attributes
// (SPEC §15, §29, §31–§35).

export const ACTIONS = [
  "ADVANCE",
  "RETREAT",
  "CHARGE",
  "MELEE_ATTACK",
  "RANGED_ATTACK",
  "DEFEND",
  "DODGE",
  "SCAN",
] as const;
export const ActionSchema = z.enum(ACTIONS);
export type Action = z.infer<typeof ActionSchema>;

// Exactly two ordered actions per mech and round (SPEC §14).
export const ActionPlanSchema = z.tuple([ActionSchema, ActionSchema]);
export type ActionPlan = z.infer<typeof ActionPlanSchema>;

export const MECH_SIDES = ["A", "B"] as const;
export const MechSideSchema = z.enum(MECH_SIDES);
export type MechSide = z.infer<typeof MechSideSchema>;

export const ARMOR_CLASSES = ["LIGHT", "MEDIUM", "HEAVY"] as const;
export const ArmorClassSchema = z.enum(ARMOR_CLASSES);
export type ArmorClass = z.infer<typeof ArmorClassSchema>;

export const MOBILITY_CLASSES = ["LOW", "MEDIUM", "HIGH"] as const;
export const MobilityClassSchema = z.enum(MOBILITY_CLASSES);
export type MobilityClass = z.infer<typeof MobilityClassSchema>;

export const MELEE_WEAPON_IDS = ["POWER_HAMMER", "ENERGY_BLADE", "IMPACT_FIST"] as const;
export const MeleeWeaponIdSchema = z.enum(MELEE_WEAPON_IDS);
export type MeleeWeaponId = z.infer<typeof MeleeWeaponIdSchema>;

export const RANGED_WEAPON_IDS = ["AUTOCANNON", "RAILGUN", "PULSE_LASER"] as const;
export const RangedWeaponIdSchema = z.enum(RANGED_WEAPON_IDS);
export type RangedWeaponId = z.infer<typeof RangedWeaponIdSchema>;

export const PROFILE_IDS = ["BRAWLER", "ASSAULT", "SKIRMISHER"] as const;
export const ProfileIdSchema = z.enum(PROFILE_IDS);
export type ProfileId = z.infer<typeof ProfileIdSchema>;

// Opponent attributes that start hidden and are revealed by SCAN (SPEC §29).
export const SCAN_ATTRIBUTES = ["MELEE_WEAPON", "RANGED_WEAPON", "ARMOR_CLASS", "MOBILITY"] as const;
export const ScanAttributeSchema = z.enum(SCAN_ATTRIBUTES);
export type ScanAttribute = z.infer<typeof ScanAttributeSchema>;

export interface ScanValues {
  MELEE_WEAPON: MeleeWeaponId;
  RANGED_WEAPON: RangedWeaponId;
  ARMOR_CLASS: ArmorClass;
  MOBILITY: MobilityClass;
}

export type ScanResult = {
  [K in ScanAttribute]: { attribute: K; value: ScanValues[K] };
}[ScanAttribute];

export interface WeaponStats {
  damage: number;
  energy: number;
}

export interface CombatProfile {
  id: ProfileId;
  hp: number;
  armor: ArmorClass;
  mobility: MobilityClass;
  meleeWeapon: MeleeWeaponId;
  rangedWeapon: RangedWeaponId;
}

export const DISTANCE_CATEGORIES = ["CLOSE", "MEDIUM", "LONG"] as const;
export type DistanceCategory = (typeof DISTANCE_CATEGORIES)[number];
