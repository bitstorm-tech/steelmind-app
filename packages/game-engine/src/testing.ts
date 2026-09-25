import type {
  ActionPlan,
  CombatEvent,
  CombatEventType,
  GameState,
  MechSide,
  ProfileId,
} from "@steelmind/game-types";
import { createMatch, resolveRound, type EngineStep } from "./match";

// Test helpers for building specific combat situations.

export interface ScenarioOptions {
  seed?: number;
  profiles?: Record<MechSide, ProfileId>;
  initiative?: MechSide;
  positions?: [number, number];
  hp?: [number, number];
  energy?: [number, number];
  round?: number;
}

export function scenario(options: ScenarioOptions = {}): GameState {
  const { state } = createMatch({
    seed: options.seed ?? 1,
    profiles: options.profiles ?? { A: "BRAWLER", B: "SKIRMISHER" },
  });
  if (options.initiative) state.initiative = options.initiative;
  if (options.positions) [state.mechs.A.position, state.mechs.B.position] = options.positions;
  if (options.hp) [state.mechs.A.hp, state.mechs.B.hp] = options.hp;
  if (options.energy) [state.mechs.A.energy, state.mechs.B.energy] = options.energy;
  if (options.round !== undefined) state.round = options.round;
  return state;
}

export function play(state: GameState, a: ActionPlan, b: ActionPlan): EngineStep {
  return resolveRound(state, { A: a, B: b });
}

export function eventsOfType<T extends CombatEventType>(
  events: CombatEvent[],
  type: T,
): Extract<CombatEvent, { type: T }>[] {
  return events.filter((e): e is Extract<CombatEvent, { type: T }> => e.type === type);
}
