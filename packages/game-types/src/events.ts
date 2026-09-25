import type {
  Action,
  MechSide,
  MeleeWeaponId,
  ProfileId,
  RangedWeaponId,
  ScanResult,
} from "./combat";
import type { ActionFailureReason, ActionSlot, MatchResult } from "./state";

// Presentation-independent combat events (SPEC §57). They carry enough data to
// recreate the whole fight visually without the Game Engine.

export type AttackKind = "MELEE" | "RANGED";

export interface MechSnapshot {
  side: MechSide;
  position: number;
  hp: number;
  energy: number;
}

export type CombatEvent =
  | {
      type: "MATCH_STARTED";
      seed: number;
      arenaLength: number;
      initiative: MechSide;
      mechs: (MechSnapshot & { profileId: ProfileId })[];
    }
  | { type: "ROUND_STARTED"; round: number; initiative: MechSide }
  | { type: "ENERGY_REGENERATED"; round: number; side: MechSide; amount: number; energy: number }
  | { type: "ACTION_STARTED"; round: number; side: MechSide; slot: ActionSlot; action: Action }
  | {
      type: "ACTION_FAILED";
      round: number;
      side: MechSide;
      slot: ActionSlot;
      action: Action;
      reason: ActionFailureReason;
    }
  | { type: "ENERGY_SPENT"; round: number; side: MechSide; amount: number; energy: number }
  | { type: "MECH_ADVANCED"; round: number; side: MechSide; from: number; to: number }
  | { type: "MECH_RETREATED"; round: number; side: MechSide; from: number; to: number }
  | { type: "CHARGE_STARTED"; round: number; side: MechSide; from: number; to: number }
  | { type: "CHARGE_CONNECTED"; round: number; side: MechSide; target: MechSide }
  | { type: "MECH_ENGAGED"; round: number; side: MechSide }
  | {
      type: "MELEE_ATTACK";
      round: number;
      side: MechSide;
      target: MechSide;
      weapon: MeleeWeaponId;
    }
  | {
      type: "RANGED_ATTACK";
      round: number;
      side: MechSide;
      target: MechSide;
      weapon: RangedWeaponId;
    }
  | {
      type: "ATTACK_DODGED";
      round: number;
      side: MechSide;
      target: MechSide;
      kind: AttackKind;
      dodgeChancePct: number;
    }
  | {
      type: "ATTACK_HIT";
      round: number;
      side: MechSide;
      target: MechSide;
      kind: AttackKind;
      baseDamage: number;
      armorReductionPct: number;
      defendReductionPct: number;
      damage: number;
    }
  | { type: "DAMAGE_TAKEN"; round: number; side: MechSide; amount: number; hp: number }
  | { type: "DEFEND_ACTIVATED"; round: number; side: MechSide; defendReductionPct: number }
  | {
      type: "DODGE_ACTIVATED";
      round: number;
      side: MechSide;
      rangedDodgePct: number;
      meleeDodgePct: number;
    }
  | { type: "SCAN_STARTED"; round: number; side: MechSide }
  | ({ type: "SCAN_COMPLETED"; round: number; side: MechSide } & ScanResult)
  | { type: "MECH_DESTROYED"; round: number; side: MechSide }
  | { type: "ROUND_COMPLETED"; round: number; mechs: MechSnapshot[] }
  | { type: "MATCH_COMPLETED"; result: MatchResult };

export type CombatEventType = CombatEvent["type"];
