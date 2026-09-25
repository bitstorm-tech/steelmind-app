import {
  COMBAT_PROFILES,
  MECH_SIDES,
  MELEE_WEAPONS,
  MOBILITY_METERS,
  RANGED_WEAPONS,
  type ActionPlan,
  type CombatEvent,
  type GameState,
  type MechSide,
  type MechView,
} from "@steelmind/game-types";
import { createMatch, resolveRound, type MatchSetup } from "./match";
import { createMechView } from "./view";

// Decides a mech's two actions from what that mech can observe. Scripted
// planners stand in for Brains until the Brain Engine exists.
export type Planner = (view: MechView) => ActionPlan;

export interface MatchRun {
  state: GameState;
  events: CombatEvent[];
}

// Runs a complete match: plan both sides from their own view, resolve, repeat.
export function runMatch(setup: MatchSetup, planners: Record<MechSide, Planner>): MatchRun {
  let { state, events } = createMatch(setup);
  const allEvents = [...events];
  while (state.result === null) {
    const plans = {
      A: planners.A(createMechView(state, "A")),
      B: planners.B(createMechView(state, "B")),
    };
    ({ state, events } = resolveRound(state, plans));
    allEvents.push(...events);
  }
  return { state, events: allEvents };
}

// Closes in and fights at melee range.
export const brawlerPlanner: Planner = (view) => {
  const profile = COMBAT_PROFILES[view.own.profileId];
  const melee = MELEE_WEAPONS[profile.meleeWeapon];
  if (view.distanceCategory === "CLOSE") {
    return view.own.energy >= melee.energy * 2 ? ["MELEE_ATTACK", "MELEE_ATTACK"] : ["MELEE_ATTACK", "DEFEND"];
  }
  if (view.distance <= MOBILITY_METERS[profile.mobility].charge) {
    return ["CHARGE", "MELEE_ATTACK"];
  }
  return ["ADVANCE", "ADVANCE"];
};

// Scans early, keeps its distance and shoots.
export const kiterPlanner: Planner = (view) => {
  const profile = COMBAT_PROFILES[view.own.profileId];
  const ranged = RANGED_WEAPONS[profile.rangedWeapon];
  if (view.round <= 2 && view.unknownEnemyAttributes.length > 0) {
    return ["SCAN", "RANGED_ATTACK"];
  }
  if (view.distanceCategory === "CLOSE") {
    return ["RETREAT", "DODGE"];
  }
  if (view.own.energy < ranged.energy * 2) {
    return ["RETREAT", "RANGED_ATTACK"];
  }
  return ["RANGED_ATTACK", "RANGED_ATTACK"];
};

export const SCRIPTED_PLANNERS = { brawler: brawlerPlanner, kiter: kiterPlanner } as const;
export type ScriptedPlannerId = keyof typeof SCRIPTED_PLANNERS;

export function describeResult(state: GameState): string {
  const result = state.result;
  if (result === null) return "Match in progress";
  const hp = MECH_SIDES.map((s) => `${s} ${state.mechs[s].hp} HP / ${state.mechs[s].energy} EN`).join(", ");
  const outcome = result.winner === null ? "DRAW" : `Mech ${result.winner} wins`;
  return `${outcome} (${result.reason}, round ${result.round}) — ${hp}`;
}
