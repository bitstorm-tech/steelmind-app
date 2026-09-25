import type {
  Action,
  DistanceCategory,
  MechSide,
  ProfileId,
  ScanAttribute,
  ScanResult,
} from "./combat";

// Authoritative match state owned by the Game Engine (SPEC §8–§41).

export const ACTION_FAILURE_REASONS = [
  "TARGET_OUT_OF_RANGE",
  "INSUFFICIENT_ENERGY",
  "ENGAGED",
  "ARENA_BOUNDARY",
  "NOTHING_LEFT_TO_SCAN",
] as const;
export type ActionFailureReason = (typeof ACTION_FAILURE_REASONS)[number];

export type ActionSlot = 1 | 2;

export interface MechState {
  side: MechSide;
  profileId: ProfileId;
  // Integer meters on the 1-D arena. Mech A is always at or left of Mech B.
  position: number;
  hp: number;
  energy: number;
  // Round-scoped effects, cleared when the round completes.
  engaged: boolean;
  defendStacks: number;
  dodgeStacks: number;
  // Opponent attributes this mech has revealed via SCAN, in reveal order.
  scannedEnemyAttributes: ScanAttribute[];
}

// Every planned action that reached execution, failed ones included (SPEC §28).
export interface ExecutedAction {
  round: number;
  side: MechSide;
  slot: ActionSlot;
  action: Action;
  failure: ActionFailureReason | null;
}

export type MatchResultReason =
  | "DESTRUCTION"
  | "DOUBLE_KO"
  | "ROUND_LIMIT_HP"
  | "ROUND_LIMIT_ENERGY"
  | "ROUND_LIMIT_DRAW";

export interface MatchResult {
  winner: MechSide | null;
  reason: MatchResultReason;
  round: number;
}

export interface GameState {
  seed: number;
  // Current RNG state; advancing it is part of resolving a round.
  rngState: number;
  // Number of completed rounds. The next round to resolve is round + 1.
  round: number;
  // Owner of Initiative for the next round.
  initiative: MechSide;
  mechs: Record<MechSide, MechState>;
  actionLog: ExecutedAction[];
  result: MatchResult | null;
}

// What one mech is allowed to know at the start of a round (SPEC §28–§30).
// Hidden opponent attributes are only present once scanned.
export interface MechView {
  side: MechSide;
  round: number;
  initiative: MechSide;
  own: {
    profileId: ProfileId;
    hp: number;
    maxHp: number;
    energy: number;
  };
  enemy: {
    hp: number;
    energy: number;
  };
  distance: number;
  distanceCategory: DistanceCategory;
  knownEnemyAttributes: ScanResult[];
  unknownEnemyAttributes: ScanAttribute[];
  enemyActions: ExecutedAction[];
}
