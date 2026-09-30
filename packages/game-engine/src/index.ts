// Pure combat simulation.
// Must not contain HTTP, database access, LLM calls, Three.js code or network requests.
// Never use Math.random() here — all randomness comes from an explicit seeded RNG.

export { getDistance, getDistanceCategory, opponentOf } from "./arena";
export {
  calculateDamage,
  createMatch,
  resolveRound,
  type EngineStep,
  type MatchSetup,
  type RoundPlans,
} from "./match";
export { createRng, type Rng } from "./rng";
export {
  brawlerPlanner,
  describeResult,
  kiterPlanner,
  opportunistPlanner,
  runMatch,
  SCRIPTED_PLANNERS,
  sentinelPlanner,
  tricksterPlanner,
  type MatchRun,
  type Planner,
  type ScriptedPlannerId,
} from "./simulate";
export { createMechView } from "./view";
