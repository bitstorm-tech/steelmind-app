import { runMatch, SCRIPTED_PLANNERS, type ScriptedPlannerId } from "@steelmind/game-engine";
import {
  MECH_SIDES,
  type Action,
  type ActionFailureReason,
  type ActionSlot,
  type CombatEvent,
  type MatchResult,
  type MechSide,
  type MechSnapshot,
  type ProfileId,
  type ScanResult,
} from "@steelmind/game-types";
import type { BrainId } from "../brain-selection/brains";
import { MELEE_NAMES, RANGED_NAMES } from "../profile-selection/profiles";

// Local simulator: runs a full match in the browser and turns the engine's
// CombatEvents into a round-by-round log for display. No LLM yet — every
// starter Brain is stood in for by the scripted planner closest to its
// directives until the Brain Engine exists (SPEC §64, Milestone 2).

export const BRAIN_PLANNERS: Record<BrainId, ScriptedPlannerId> = {
  BERSERKER: "brawler",
  SENTINEL: "sentinel",
  OPPORTUNIST: "opportunist",
  TECHNICIAN: "kiter",
  TRICKSTER: "trickster",
};

export interface Loadout {
  brainId: BrainId;
  profileId: ProfileId;
}

export interface SimulationSetup {
  seed: number;
  loadouts: Record<MechSide, Loadout>;
}

export type DetailTone = "move" | "hit" | "miss" | "buff" | "scan";

export interface LogDetail {
  tone: DetailTone;
  text: string;
}

export interface LogAction {
  side: MechSide;
  slot: ActionSlot;
  action: Action;
  weapon: string | null;
  energySpent: number;
  failure: ActionFailureReason | null;
  details: LogDetail[];
}

export interface LogRound {
  round: number;
  initiative: MechSide;
  actions: LogAction[];
  destroyed: MechSide[];
  mechs: Record<MechSide, MechSnapshot>;
  distance: number;
}

export interface SimulationLog {
  seed: number;
  arenaLength: number;
  initiative: MechSide;
  start: Record<MechSide, MechSnapshot & { profileId: ProfileId }>;
  rounds: LogRound[];
  result: MatchResult;
}

export const FAILURE_LABELS: Record<ActionFailureReason, string> = {
  TARGET_OUT_OF_RANGE: "OUT OF RANGE",
  INSUFFICIENT_ENERGY: "NO ENERGY",
  ENGAGED: "ENGAGED",
  ARENA_BOUNDARY: "ARENA EDGE",
  NOTHING_LEFT_TO_SCAN: "NOTHING TO SCAN",
};

export const RESULT_LABELS: Record<MatchResult["reason"], string> = {
  DESTRUCTION: "Destruction",
  DOUBLE_KO: "Double KO",
  ROUND_LIMIT_HP: "Round limit — higher HP",
  ROUND_LIMIT_ENERGY: "Round limit — higher Energy",
  ROUND_LIMIT_DRAW: "Round limit — dead even",
};

function scanValueLabel(scan: ScanResult): string {
  switch (scan.attribute) {
    case "MELEE_WEAPON":
      return MELEE_NAMES[scan.value];
    case "RANGED_WEAPON":
      return RANGED_NAMES[scan.value];
    case "ARMOR_CLASS":
    case "MOBILITY":
      return scan.value;
  }
}

function bySide<T>(items: (T & { side: MechSide })[]): Record<MechSide, T> {
  const [a, b] = MECH_SIDES.map((side) => items.find((item) => item.side === side)!);
  return { A: a!, B: b! };
}

// Groups the flat event stream into rounds and actions. Every detail event
// belongs to the most recent ACTION_STARTED.
export function buildLog(events: CombatEvent[]): SimulationLog {
  const started = events[0];
  const completed = events.at(-1);
  if (started?.type !== "MATCH_STARTED" || completed?.type !== "MATCH_COMPLETED") {
    throw new Error("Expected a complete match event stream");
  }

  const rounds: LogRound[] = [];
  let round: LogRound | null = null;
  let action: LogAction | null = null;
  const detail = (tone: DetailTone, text: string) => action?.details.push({ tone, text });

  for (const event of events) {
    switch (event.type) {
      case "ROUND_STARTED":
        round = {
          round: event.round,
          initiative: event.initiative,
          actions: [],
          destroyed: [],
          mechs: bySide(started.mechs),
          distance: 0,
        };
        rounds.push(round);
        action = null;
        break;
      case "ACTION_STARTED":
        action = { side: event.side, slot: event.slot, action: event.action, weapon: null, energySpent: 0, failure: null, details: [] };
        round?.actions.push(action);
        break;
      case "ACTION_FAILED":
        if (action) action.failure = event.reason;
        break;
      case "ENERGY_SPENT":
        if (action) action.energySpent += event.amount;
        break;
      case "MECH_ADVANCED":
      case "MECH_RETREATED":
      case "CHARGE_STARTED":
        detail("move", `${event.from} m → ${event.to} m`);
        break;
      case "CHARGE_CONNECTED":
        detail("hit", `Contact — ${event.target} ENGAGED`);
        break;
      case "MELEE_ATTACK":
        if (action) action.weapon = MELEE_NAMES[event.weapon];
        break;
      case "RANGED_ATTACK":
        if (action) action.weapon = RANGED_NAMES[event.weapon];
        break;
      case "ATTACK_DODGED":
        detail("miss", `Dodged (${event.dodgeChancePct}% chance)`);
        break;
      case "ATTACK_HIT": {
        const reductions = [
          event.armorReductionPct > 0 ? `armor −${event.armorReductionPct}%` : null,
          event.defendReductionPct > 0 ? `defend −${event.defendReductionPct}%` : null,
        ].filter((r) => r !== null);
        const breakdown = reductions.length > 0 ? ` (${event.baseDamage} base, ${reductions.join(", ")})` : "";
        detail("hit", `Hit ${event.target} for ${event.damage}${breakdown}`);
        break;
      }
      case "DAMAGE_TAKEN":
        detail("hit", `${event.side} at ${event.hp} HP`);
        break;
      case "DEFEND_ACTIVATED":
        detail("buff", `Incoming damage −${event.defendReductionPct}%`);
        break;
      case "DODGE_ACTIVATED":
        detail("buff", `Dodge ${event.rangedDodgePct}% ranged / ${event.meleeDodgePct}% melee`);
        break;
      case "SCAN_COMPLETED":
        detail("scan", `Revealed ${event.attribute.replace("_", " ")}: ${scanValueLabel(event)}`);
        break;
      case "MECH_DESTROYED":
        round?.destroyed.push(event.side);
        break;
      case "ROUND_COMPLETED":
        if (round) {
          round.mechs = bySide(event.mechs);
          round.distance = round.mechs.B.position - round.mechs.A.position;
        }
        action = null;
        break;
      default:
        break;
    }
  }

  return {
    seed: started.seed,
    arenaLength: started.arenaLength,
    initiative: started.initiative,
    start: bySide(started.mechs),
    rounds,
    result: completed.result,
  };
}

export function runSimulation(setup: SimulationSetup): SimulationLog {
  const { loadouts } = setup;
  const { events } = runMatch(
    { seed: setup.seed, profiles: { A: loadouts.A.profileId, B: loadouts.B.profileId } },
    {
      A: SCRIPTED_PLANNERS[BRAIN_PLANNERS[loadouts.A.brainId]],
      B: SCRIPTED_PLANNERS[BRAIN_PLANNERS[loadouts.B.brainId]],
    },
  );
  return buildLog(events);
}
