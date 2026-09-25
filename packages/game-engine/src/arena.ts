import {
  ARENA_LENGTH_METERS,
  CLOSE_MAX_METERS,
  MEDIUM_MAX_METERS,
  type DistanceCategory,
  type GameState,
  type MechSide,
} from "@steelmind/game-types";

// 1-D arena geometry (SPEC §11–§13). Mech A always stays at or left of Mech B
// because mechs can never pass through each other, so "toward the enemy" is
// +1 for A and -1 for B.

export function opponentOf(side: MechSide): MechSide {
  return side === "A" ? "B" : "A";
}

export function getDistance(state: GameState): number {
  return state.mechs.B.position - state.mechs.A.position;
}

export function getDistanceCategory(distance: number): DistanceCategory {
  if (distance <= CLOSE_MAX_METERS) return "CLOSE";
  if (distance <= MEDIUM_MAX_METERS) return "MEDIUM";
  return "LONG";
}

// Moves toward the opponent by up to `meters`, stopping face to face.
export function moveToward(state: GameState, side: MechSide, meters: number): number {
  const step = Math.min(meters, getDistance(state));
  const mech = state.mechs[side];
  mech.position += side === "A" ? step : -step;
  return mech.position;
}

// Moves away from the opponent by up to `meters`, clamped at the arena edge.
export function moveAway(state: GameState, side: MechSide, meters: number): number {
  const mech = state.mechs[side];
  mech.position =
    side === "A"
      ? Math.max(0, mech.position - meters)
      : Math.min(ARENA_LENGTH_METERS, mech.position + meters);
  return mech.position;
}

export function isAtRetreatBoundary(state: GameState, side: MechSide): boolean {
  const position = state.mechs[side].position;
  return side === "A" ? position === 0 : position === ARENA_LENGTH_METERS;
}
