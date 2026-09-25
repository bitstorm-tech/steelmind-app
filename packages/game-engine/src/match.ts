import {
  ACTION_ENERGY_COST,
  ARENA_LENGTH_METERS,
  ARMOR_REDUCTION_PCT,
  COMBAT_PROFILES,
  DEFEND_REDUCTION_PCT,
  DODGE_CHANCE_PCT,
  ENERGY_REGEN_PER_ROUND,
  MAX_ENERGY,
  MAX_ROUNDS,
  MECH_SIDES,
  MELEE_MAX_RANGE_METERS,
  MELEE_WEAPONS,
  MOBILITY_METERS,
  RANGED_WEAPONS,
  STARTING_ENERGY,
  STARTING_POSITIONS,
  type Action,
  type ActionFailureReason,
  type ActionPlan,
  type ActionSlot,
  type AttackKind,
  type CombatEvent,
  type GameState,
  type MatchResult,
  type MechSide,
  type MechSnapshot,
  type MechState,
  type ProfileId,
} from "@steelmind/game-types";
import {
  getDistance,
  isAtRetreatBoundary,
  moveAway,
  moveToward,
  opponentOf,
} from "./arena";
import { createRng, normalizeSeed, type Rng } from "./rng";
import { revealAttribute, unknownEnemyAttributes } from "./scan";

export interface MatchSetup {
  seed: number;
  profiles: Record<MechSide, ProfileId>;
}

export interface EngineStep {
  state: GameState;
  events: CombatEvent[];
}

export type RoundPlans = Record<MechSide, ActionPlan>;

function createMech(side: MechSide, profileId: ProfileId): MechState {
  return {
    side,
    profileId,
    position: STARTING_POSITIONS[side],
    hp: COMBAT_PROFILES[profileId].hp,
    energy: STARTING_ENERGY,
    engaged: false,
    defendStacks: 0,
    dodgeStacks: 0,
    scannedEnemyAttributes: [],
  };
}

function snapshot(mech: MechState): MechSnapshot {
  return { side: mech.side, position: mech.position, hp: mech.hp, energy: mech.energy };
}

export function createMatch(setup: MatchSetup): EngineStep {
  const seed = normalizeSeed(setup.seed);
  const rng = createRng(seed);
  // Initial Initiative comes from the seeded RNG (SPEC §9).
  const initiative: MechSide = rng.int(2) === 0 ? "A" : "B";
  const state: GameState = {
    seed,
    rngState: rng.state(),
    round: 0,
    initiative,
    mechs: { A: createMech("A", setup.profiles.A), B: createMech("B", setup.profiles.B) },
    actionLog: [],
    result: null,
  };
  const event: CombatEvent = {
    type: "MATCH_STARTED",
    seed,
    arenaLength: ARENA_LENGTH_METERS,
    initiative,
    mechs: MECH_SIDES.map((side) => ({
      ...snapshot(state.mechs[side]),
      profileId: state.mechs[side].profileId,
    })),
  };
  return { state, events: [event] };
}

// Execution scope for one round. `state` is a private copy and mutated freely.
interface RoundContext {
  state: GameState;
  rng: Rng;
  round: number;
  events: CombatEvent[];
}

// Resolves one full round (SPEC §8): regenerate, execute four slots in
// Initiative order, then evaluate destruction and match end. Pure: the input
// state is not modified.
export function resolveRound(previous: GameState, plans: RoundPlans): EngineStep {
  if (previous.result !== null) {
    throw new Error("Match is already completed");
  }

  const state = structuredClone(previous);
  const round = state.round + 1;
  const ctx: RoundContext = { state, rng: createRng(state.rngState), round, events: [] };
  const first = state.initiative;
  const second = opponentOf(first);

  ctx.events.push({ type: "ROUND_STARTED", round, initiative: first });
  for (const side of MECH_SIDES) {
    regenerateEnergy(ctx, side);
  }

  for (const slot of [1, 2] as const) {
    for (const side of [first, second]) {
      executeAction(ctx, side, slot, plans[side][slot - 1]!);
    }
  }

  // Destruction is only evaluated after all four actions (SPEC §10).
  for (const side of MECH_SIDES) {
    if (state.mechs[side].hp <= 0) {
      ctx.events.push({ type: "MECH_DESTROYED", round, side });
    }
  }
  state.result = determineResult(state, round);

  for (const side of MECH_SIDES) {
    const mech = state.mechs[side];
    mech.engaged = false;
    mech.defendStacks = 0;
    mech.dodgeStacks = 0;
  }
  state.round = round;
  state.initiative = second;
  state.rngState = ctx.rng.state();

  ctx.events.push({
    type: "ROUND_COMPLETED",
    round,
    mechs: MECH_SIDES.map((side) => snapshot(state.mechs[side])),
  });
  if (state.result !== null) {
    ctx.events.push({ type: "MATCH_COMPLETED", result: state.result });
  }
  return { state, events: ctx.events };
}

function determineResult(state: GameState, round: number): MatchResult | null {
  const { A, B } = state.mechs;
  const aDown = A.hp <= 0;
  const bDown = B.hp <= 0;
  if (aDown && bDown) return { winner: null, reason: "DOUBLE_KO", round };
  if (aDown) return { winner: "B", reason: "DESTRUCTION", round };
  if (bDown) return { winner: "A", reason: "DESTRUCTION", round };

  if (round < MAX_ROUNDS) return null;
  // Round limit tiebreak (SPEC §41).
  if (A.hp !== B.hp) {
    return { winner: A.hp > B.hp ? "A" : "B", reason: "ROUND_LIMIT_HP", round };
  }
  if (A.energy !== B.energy) {
    return { winner: A.energy > B.energy ? "A" : "B", reason: "ROUND_LIMIT_ENERGY", round };
  }
  return { winner: null, reason: "ROUND_LIMIT_DRAW", round };
}

function regenerateEnergy(ctx: RoundContext, side: MechSide): void {
  const mech = ctx.state.mechs[side];
  const energy = Math.min(MAX_ENERGY, mech.energy + ENERGY_REGEN_PER_ROUND);
  const amount = energy - mech.energy;
  mech.energy = energy;
  ctx.events.push({ type: "ENERGY_REGENERATED", round: ctx.round, side, amount, energy });
}

// Energy is consumed only when an action actually executes (SPEC §37).
function spendEnergy(ctx: RoundContext, side: MechSide, amount: number): boolean {
  const mech = ctx.state.mechs[side];
  if (mech.energy < amount) return false;
  if (amount > 0) {
    mech.energy -= amount;
    ctx.events.push({ type: "ENERGY_SPENT", round: ctx.round, side, amount, energy: mech.energy });
  }
  return true;
}

function executeAction(ctx: RoundContext, side: MechSide, slot: ActionSlot, action: Action): void {
  ctx.events.push({ type: "ACTION_STARTED", round: ctx.round, side, slot, action });
  const failure = performAction(ctx, side, action);
  if (failure !== null) {
    ctx.events.push({ type: "ACTION_FAILED", round: ctx.round, side, slot, action, reason: failure });
  }
  ctx.state.actionLog.push({ round: ctx.round, side, slot, action, failure });
}

function performAction(ctx: RoundContext, side: MechSide, action: Action): ActionFailureReason | null {
  switch (action) {
    case "ADVANCE":
      return advance(ctx, side);
    case "RETREAT":
      return retreat(ctx, side);
    case "CHARGE":
      return charge(ctx, side);
    case "MELEE_ATTACK":
      return attack(ctx, side, "MELEE");
    case "RANGED_ATTACK":
      return attack(ctx, side, "RANGED");
    case "DEFEND":
      return defend(ctx, side);
    case "DODGE":
      return dodge(ctx, side);
    case "SCAN":
      return scan(ctx, side);
  }
}

function mobilityOf(mech: MechState) {
  return MOBILITY_METERS[COMBAT_PROFILES[mech.profileId].mobility];
}

function advance(ctx: RoundContext, side: MechSide): ActionFailureReason | null {
  const mech = ctx.state.mechs[side];
  if (mech.engaged) return "ENGAGED";
  const from = mech.position;
  const to = moveToward(ctx.state, side, mobilityOf(mech).advance);
  ctx.events.push({ type: "MECH_ADVANCED", round: ctx.round, side, from, to });
  return null;
}

function retreat(ctx: RoundContext, side: MechSide): ActionFailureReason | null {
  const mech = ctx.state.mechs[side];
  if (mech.engaged) return "ENGAGED";
  if (isAtRetreatBoundary(ctx.state, side)) return "ARENA_BOUNDARY";
  const from = mech.position;
  const to = moveAway(ctx.state, side, mobilityOf(mech).advance);
  ctx.events.push({ type: "MECH_RETREATED", round: ctx.round, side, from, to });
  return null;
}

// CHARGE always executes regardless of range; only the target gets ENGAGED (SPEC §20–§21).
function charge(ctx: RoundContext, side: MechSide): ActionFailureReason | null {
  const mech = ctx.state.mechs[side];
  if (!spendEnergy(ctx, side, ACTION_ENERGY_COST.CHARGE)) return "INSUFFICIENT_ENERGY";
  const from = mech.position;
  const to = moveToward(ctx.state, side, mobilityOf(mech).charge);
  ctx.events.push({ type: "CHARGE_STARTED", round: ctx.round, side, from, to });
  if (getDistance(ctx.state) === 0) {
    const target = opponentOf(side);
    ctx.state.mechs[target].engaged = true;
    ctx.events.push({ type: "CHARGE_CONNECTED", round: ctx.round, side, target });
    ctx.events.push({ type: "MECH_ENGAGED", round: ctx.round, side: target });
  }
  return null;
}

// Attack resolution order from SPEC §26.
function attack(ctx: RoundContext, side: MechSide, kind: AttackKind): ActionFailureReason | null {
  const distance = getDistance(ctx.state);
  const inRange = kind === "MELEE" ? distance <= MELEE_MAX_RANGE_METERS : distance > MELEE_MAX_RANGE_METERS;
  if (!inRange) return "TARGET_OUT_OF_RANGE";

  const attacker = ctx.state.mechs[side];
  const profile = COMBAT_PROFILES[attacker.profileId];
  const weapon = kind === "MELEE" ? MELEE_WEAPONS[profile.meleeWeapon] : RANGED_WEAPONS[profile.rangedWeapon];
  if (!spendEnergy(ctx, side, weapon.energy)) return "INSUFFICIENT_ENERGY";

  const targetSide = opponentOf(side);
  if (kind === "MELEE") {
    ctx.events.push({ type: "MELEE_ATTACK", round: ctx.round, side, target: targetSide, weapon: profile.meleeWeapon });
  } else {
    ctx.events.push({ type: "RANGED_ATTACK", round: ctx.round, side, target: targetSide, weapon: profile.rangedWeapon });
  }

  const target = ctx.state.mechs[targetSide];
  const dodgeChancePct = target.dodgeStacks * DODGE_CHANCE_PCT[kind];
  if (dodgeChancePct > 0 && ctx.rng.int(100) < dodgeChancePct) {
    ctx.events.push({ type: "ATTACK_DODGED", round: ctx.round, side, target: targetSide, kind, dodgeChancePct });
    return null;
  }

  const armorReductionPct = ARMOR_REDUCTION_PCT[COMBAT_PROFILES[target.profileId].armor];
  const defendReductionPct = target.defendStacks * DEFEND_REDUCTION_PCT;
  const damage = calculateDamage(weapon.damage, armorReductionPct, defendReductionPct);
  ctx.events.push({
    type: "ATTACK_HIT",
    round: ctx.round,
    side,
    target: targetSide,
    kind,
    baseDamage: weapon.damage,
    armorReductionPct,
    defendReductionPct,
    damage,
  });
  target.hp = Math.max(0, target.hp - damage);
  ctx.events.push({ type: "DAMAGE_TAKEN", round: ctx.round, side: targetSide, amount: damage, hp: target.hp });
  return null;
}

// base × (1 − armor) × (1 − defend), rounded half up. Integer math keeps the
// result exact and platform independent (SPEC §26).
export function calculateDamage(base: number, armorReductionPct: number, defendReductionPct: number): number {
  const scaled = base * (100 - armorReductionPct) * (100 - defendReductionPct);
  return Math.floor((2 * scaled + 10_000) / 20_000);
}

function defend(ctx: RoundContext, side: MechSide): ActionFailureReason | null {
  if (!spendEnergy(ctx, side, ACTION_ENERGY_COST.DEFEND)) return "INSUFFICIENT_ENERGY";
  const mech = ctx.state.mechs[side];
  mech.defendStacks += 1;
  ctx.events.push({
    type: "DEFEND_ACTIVATED",
    round: ctx.round,
    side,
    defendReductionPct: mech.defendStacks * DEFEND_REDUCTION_PCT,
  });
  return null;
}

function dodge(ctx: RoundContext, side: MechSide): ActionFailureReason | null {
  if (!spendEnergy(ctx, side, ACTION_ENERGY_COST.DODGE)) return "INSUFFICIENT_ENERGY";
  const mech = ctx.state.mechs[side];
  mech.dodgeStacks += 1;
  ctx.events.push({
    type: "DODGE_ACTIVATED",
    round: ctx.round,
    side,
    rangedDodgePct: mech.dodgeStacks * DODGE_CHANCE_PCT.RANGED,
    meleeDodgePct: mech.dodgeStacks * DODGE_CHANCE_PCT.MELEE,
  });
  return null;
}

function scan(ctx: RoundContext, side: MechSide): ActionFailureReason | null {
  const mech = ctx.state.mechs[side];
  const unknown = unknownEnemyAttributes(mech);
  if (unknown.length === 0) return "NOTHING_LEFT_TO_SCAN";
  if (!spendEnergy(ctx, side, ACTION_ENERGY_COST.SCAN)) return "INSUFFICIENT_ENERGY";
  ctx.events.push({ type: "SCAN_STARTED", round: ctx.round, side });
  const attribute = unknown[ctx.rng.int(unknown.length)]!;
  mech.scannedEnemyAttributes.push(attribute);
  const enemyProfile = ctx.state.mechs[opponentOf(side)].profileId;
  ctx.events.push({ type: "SCAN_COMPLETED", round: ctx.round, side, ...revealAttribute(enemyProfile, attribute) });
  return null;
}
