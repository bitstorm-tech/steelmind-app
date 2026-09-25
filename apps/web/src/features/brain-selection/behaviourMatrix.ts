import type { BrainId } from "./brains";

// Radar values (0–100) for the Brain Selection "behaviour matrix". Flavour
// preview only — not engine data; the Brain Engine reads directives, never
// these numbers.

export const MATRIX_AXES = ["AGGRESSION", "DEFENSE", "INTEL", "MOBILITY", "RISK"] as const;

export type BehaviourMatrix = [number, number, number, number, number];

export const BEHAVIOUR_MATRIX: Record<BrainId, BehaviourMatrix> = {
  BERSERKER: [95, 10, 15, 60, 90],
  SENTINEL: [30, 95, 50, 20, 20],
  OPPORTUNIST: [65, 40, 55, 65, 55],
  TECHNICIAN: [25, 50, 95, 45, 30],
  TRICKSTER: [55, 45, 40, 90, 70],
};
