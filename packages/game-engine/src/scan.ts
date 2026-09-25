import {
  COMBAT_PROFILES,
  SCAN_ATTRIBUTES,
  type MechState,
  type ProfileId,
  type ScanAttribute,
  type ScanResult,
} from "@steelmind/game-types";

// Hidden opponent attributes and their revealed values (SPEC §27, §29).

export function revealAttribute(profileId: ProfileId, attribute: ScanAttribute): ScanResult {
  const profile = COMBAT_PROFILES[profileId];
  switch (attribute) {
    case "MELEE_WEAPON":
      return { attribute, value: profile.meleeWeapon };
    case "RANGED_WEAPON":
      return { attribute, value: profile.rangedWeapon };
    case "ARMOR_CLASS":
      return { attribute, value: profile.armor };
    case "MOBILITY":
      return { attribute, value: profile.mobility };
  }
}

// Opponent attributes the scanning mech has not revealed yet, in canonical order.
export function unknownEnemyAttributes(scanner: MechState): ScanAttribute[] {
  return SCAN_ATTRIBUTES.filter((a) => !scanner.scannedEnemyAttributes.includes(a));
}
