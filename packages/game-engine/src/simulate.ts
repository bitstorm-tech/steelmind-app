import {
  ACTION_ENERGY_COST,
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

function lastEnemyAction(view: MechView) {
  return view.enemyActions.at(-1)?.action;
}

// Holds ground behind DEFEND, shoots from range and answers contact with melee.
export const sentinelPlanner: Planner = (view) => {
  const profile = COMBAT_PROFILES[view.own.profileId];
  const melee = MELEE_WEAPONS[profile.meleeWeapon];
  const ranged = RANGED_WEAPONS[profile.rangedWeapon];
  const close = view.distanceCategory === "CLOSE";
  if (view.round <= 2 && view.unknownEnemyAttributes.length > 0) {
    return ["SCAN", "DEFEND"];
  }
  if (view.own.hp * 100 < view.own.maxHp * 30) {
    return close ? ["DEFEND", "MELEE_ATTACK"] : ["DEFEND", "RANGED_ATTACK"];
  }
  if (close) {
    return view.own.energy >= melee.energy + ACTION_ENERGY_COST.DEFEND ? ["DEFEND", "MELEE_ATTACK"] : ["DEFEND", "DEFEND"];
  }
  if (lastEnemyAction(view) === "CHARGE" || view.own.energy < 50) {
    return ["DEFEND", "RANGED_ATTACK"];
  }
  return view.own.energy >= 50 + ranged.energy * 2 ? ["RANGED_ATTACK", "RANGED_ATTACK"] : ["RANGED_ATTACK", "DEFEND"];
};

// Holds MEDIUM range and commits to melee once the enemy runs low on energy.
export const opportunistPlanner: Planner = (view) => {
  const profile = COMBAT_PROFILES[view.own.profileId];
  const melee = MELEE_WEAPONS[profile.meleeWeapon];
  const ranged = RANGED_WEAPONS[profile.rangedWeapon];
  const enemyDrained = view.enemy.energy < 25;
  if (view.round === 1 && view.unknownEnemyAttributes.length > 0) {
    return ["SCAN", "ADVANCE"];
  }
  if (view.own.hp * 100 < view.own.maxHp * 35) {
    return view.distanceCategory === "CLOSE" ? ["RETREAT", "DODGE"] : ["RETREAT", "RANGED_ATTACK"];
  }
  switch (view.distanceCategory) {
    case "CLOSE":
      if (lastEnemyAction(view) === "CHARGE") return ["DODGE", "MELEE_ATTACK"];
      if (enemyDrained || view.initiative === view.side) {
        return view.own.energy >= melee.energy * 2 ? ["MELEE_ATTACK", "MELEE_ATTACK"] : ["MELEE_ATTACK", "DODGE"];
      }
      return ["MELEE_ATTACK", "RETREAT"];
    case "MEDIUM":
      if (enemyDrained) return ["ADVANCE", "MELEE_ATTACK"];
      return view.own.energy >= ranged.energy * 2 + 20 ? ["RANGED_ATTACK", "RANGED_ATTACK"] : ["RANGED_ATTACK", "DEFEND"];
    case "LONG":
      return ["ADVANCE", "RANGED_ATTACK"];
  }
};

// Breaks patterns: alternates feints by round parity and bursts in with CHARGE.
export const tricksterPlanner: Planner = (view) => {
  const profile = COMBAT_PROFILES[view.own.profileId];
  const melee = MELEE_WEAPONS[profile.meleeWeapon];
  const odd = view.round % 2 === 1;
  const canBurst =
    view.own.energy >= ACTION_ENERGY_COST.CHARGE + melee.energy &&
    view.distance <= MOBILITY_METERS[profile.mobility].charge;
  if (view.round === 1 && view.unknownEnemyAttributes.length > 0) {
    return ["SCAN", "DODGE"];
  }
  if (view.own.hp * 100 < view.own.maxHp * 25) {
    return ["RETREAT", "DODGE"];
  }
  if (view.distanceCategory === "CLOSE") {
    return odd ? ["MELEE_ATTACK", "DODGE"] : ["DEFEND", "MELEE_ATTACK"];
  }
  if (canBurst && (lastEnemyAction(view) === "DEFEND" || view.round % 3 === 0)) {
    return ["CHARGE", "MELEE_ATTACK"];
  }
  if (view.distanceCategory === "MEDIUM") {
    return odd ? ["ADVANCE", "RANGED_ATTACK"] : ["RETREAT", "RANGED_ATTACK"];
  }
  return view.enemy.energy < 50 ? ["RANGED_ATTACK", "RANGED_ATTACK"] : ["ADVANCE", "RANGED_ATTACK"];
};

export const SCRIPTED_PLANNERS = {
  brawler: brawlerPlanner,
  kiter: kiterPlanner,
  sentinel: sentinelPlanner,
  opportunist: opportunistPlanner,
  trickster: tricksterPlanner,
} as const;
export type ScriptedPlannerId = keyof typeof SCRIPTED_PLANNERS;

export function describeResult(state: GameState): string {
  const result = state.result;
  if (result === null) return "Match in progress";
  const hp = MECH_SIDES.map((s) => `${s} ${state.mechs[s].hp} HP / ${state.mechs[s].energy} EN`).join(", ");
  const outcome = result.winner === null ? "DRAW" : `Mech ${result.winner} wins`;
  return `${outcome} (${result.reason}, round ${result.round}) — ${hp}`;
}
