// Starter Brain data for the selection screen (SPEC §52).
// Brain structure, condition sources and prompt length limits are from
// SPEC §42–§47; gameplay keywords from §50. Starter Brains are complete,
// valid brains — customization (Brain Editor, §51) is a later step.

import type { ScanAttribute } from "@steelmind/game-types";

export type BrainId =
  | "BERSERKER"
  | "SENTINEL"
  | "OPPORTUNIST"
  | "TECHNICIAN"
  | "TRICKSTER";

// Trigger condition sources, SPEC §46. KNOWN_/UNKNOWN_ sources encode the
// scan state of one hidden enemy attribute in the source itself.
export type { ScanAttribute };

export type ScanStateSource = `KNOWN_${ScanAttribute}` | `UNKNOWN_${ScanAttribute}`;

export type TriggerSource =
  | "OWN_HP"
  | "OWN_ENERGY"
  | "ENEMY_HP"
  | "ENEMY_ENERGY"
  | "DISTANCE"
  | "DISTANCE_CATEGORY"
  | "CURRENT_ROUND"
  | "INITIATIVE"
  | "PREVIOUS_ENEMY_ACTION"
  | ScanStateSource;

export type TriggerOperator = "<" | "<=" | "=" | ">=" | ">" | "!=";

// SPEC §45: HP and Energy conditions carry a unit (absolute or percent).
export type TriggerUnit = "absolute" | "percent";

export interface TriggerCondition {
  source: TriggerSource;
  operator: TriggerOperator;
  value: number | string;
  unit?: TriggerUnit | undefined;
}

export interface TriggerSlot {
  condition: TriggerCondition;
  directive: string;
}

export interface EmergencyProtocol {
  // Fixed trigger: WHEN OWN HP < threshold (percent, SPEC §47).
  hpThresholdPercent: number;
  directive: string;
}

export interface BrainSpec {
  id: BrainId;
  designation: string;
  name: string;
  role: string;
  coreDirective: string;
  openingDirective: string;
  triggerSlots: [TriggerSlot, TriggerSlot, TriggerSlot];
  emergency: EmergencyProtocol;
  accent: string;
}

// Recognized gameplay keywords, SPEC §50.
export const GAMEPLAY_KEYWORDS = [
  // actions
  "ADVANCE",
  "RETREAT",
  "CHARGE",
  "MELEE_ATTACK",
  "RANGED_ATTACK",
  "DEFEND",
  "DODGE",
  "SCAN",
  // resources / state
  "HP",
  "ENERGY",
  "DISTANCE",
  "INITIATIVE",
  "ROUND",
  // distance
  "CLOSE",
  "MEDIUM",
  "LONG",
  // scan attributes
  "MELEE_WEAPON",
  "RANGED_WEAPON",
  "ARMOR_CLASS",
  "MOBILITY",
] as const;

export type GameplayKeyword = (typeof GAMEPLAY_KEYWORDS)[number];

// Prompt length limits in characters, SPEC §49.
export const DIRECTIVE_LIMITS = {
  core: 200,
  opening: 140,
  trigger: 120,
  emergency: 140,
} as const;

export const STARTER_BRAINS: BrainSpec[] = [
  {
    id: "BERSERKER",
    designation: "BRN-01",
    name: "Berserker",
    role: "Aggression as a system.",
    coreDirective:
      "Close distance at any cost. Open with CHARGE, force ENGAGED combat, and win trades with MELEE_ATTACK. Never DEFEND while HP remains.",
    openingDirective:
      "ROUND 1: CHARGE immediately. SCAN only if ENERGY is too low to move.",
    triggerSlots: [
      {
        condition: { source: "OWN_ENERGY", operator: ">=", value: 20, unit: "absolute" },
        directive: "CHARGE the enemy and finish with MELEE_ATTACK.",
      },
      {
        condition: { source: "DISTANCE_CATEGORY", operator: "!=", value: "CLOSE" },
        directive: "ADVANCE at full speed; keep ENERGY reserved for CHARGE.",
      },
      {
        condition: { source: "PREVIOUS_ENEMY_ACTION", operator: "=", value: "RETREAT" },
        directive: "PRESS the hunt: CHARGE to deny their escape.",
      },
    ],
    emergency: {
      hpThresholdPercent: 25,
      directive:
        "All-in: ignore DEFEND, spend every point of ENERGY on CHARGE and MELEE_ATTACK.",
    },
    accent: "#e25837",
  },
  {
    id: "SENTINEL",
    designation: "BRN-02",
    name: "Sentinel",
    role: "The wall that answers back.",
    coreDirective:
      "Hold ground and outlast. Prefer DEFEND over DODGE, keep ENERGY above half, and punish every reckless CHARGE with MELEE_ATTACK.",
    openingDirective:
      "ROUNDS 1-3: SCAN first, then DEFEND. No CHARGE until the enemy reveals its weapons.",
    triggerSlots: [
      {
        condition: { source: "OWN_ENERGY", operator: "<", value: 25, unit: "percent" },
        directive: "DEFEND and avoid expensive actions while ENERGY regenerates.",
      },
      {
        condition: { source: "ENEMY_HP", operator: ">", value: 50, unit: "percent" },
        directive: "RANGED_ATTACK from LONG distance; never trade HP while they are strong.",
      },
      {
        condition: { source: "PREVIOUS_ENEMY_ACTION", operator: "=", value: "CHARGE" },
        directive: "Brace: DEFEND to stack armor reduction before impact.",
      },
    ],
    emergency: {
      hpThresholdPercent: 30,
      directive:
        "Survival mode: DEFEND every ROUND and RANGED_ATTACK only with spare ENERGY.",
    },
    accent: "#5aa9b8",
  },
  {
    id: "OPPORTUNIST",
    designation: "BRN-03",
    name: "Opportunist",
    role: "Punish every opening.",
    coreDirective:
      "Strike only when the enemy is weak. Watch ENEMY HP and ENERGY, hold MEDIUM range, and take every trade while INITIATIVE is yours.",
    openingDirective:
      "ROUND 1: SCAN the enemy, then hold MEDIUM distance and wait for the opening.",
    triggerSlots: [
      {
        condition: { source: "ENEMY_ENERGY", operator: "<", value: 25, unit: "percent" },
        directive: "ADVANCE and press with MELEE_ATTACK; they cannot pay for escapes.",
      },
      {
        condition: { source: "PREVIOUS_ENEMY_ACTION", operator: "=", value: "CHARGE" },
        directive: "DODGE the rush, then counter with MELEE_ATTACK.",
      },
      {
        condition: { source: "INITIATIVE", operator: "=", value: "OWN" },
        directive: "Take the trade now: MELEE_ATTACK before the enemy can answer.",
      },
    ],
    emergency: {
      hpThresholdPercent: 35,
      directive: "Break contact: RETREAT and RANGED_ATTACK from LONG until HP stabilizes.",
    },
    accent: "#ffb020",
  },
  {
    id: "TECHNICIAN",
    designation: "BRN-04",
    name: "Technician",
    role: "Information is ammunition.",
    coreDirective:
      "Win with information. SCAN until every enemy attribute is KNOWN, then spend ENERGY only on efficient, verified actions.",
    openingDirective:
      "ROUNDS 1-3: SCAN every ROUND. No CHARGE and no MELEE_ATTACK until the enemy is mapped.",
    triggerSlots: [
      {
        condition: { source: "UNKNOWN_MELEE_WEAPON", operator: "=", value: "TRUE" },
        directive: "SCAN before attacking; unknown weapons cost HP.",
      },
      {
        condition: { source: "DISTANCE", operator: "<=", value: 10 },
        directive: "RETREAT out of CLOSE; trade only from range with RANGED_ATTACK.",
      },
      {
        condition: { source: "OWN_ENERGY", operator: "=", value: 100, unit: "percent" },
        directive: "Convert full ENERGY into RANGED_ATTACK pressure.",
      },
    ],
    emergency: {
      hpThresholdPercent: 30,
      directive:
        "Stall: DEFEND, RETREAT and DODGE while ENERGY regenerates. HP is recoverable, information is not.",
    },
    accent: "#62b85a",
  },
  {
    id: "TRICKSTER",
    designation: "BRN-05",
    name: "Trickster",
    role: "Pattern breaks win fights.",
    coreDirective:
      "Be unreadable. Mix DODGE, DEFEND and sudden CHARGE bursts so the enemy never sees one pattern. Feint at MEDIUM, strike at CLOSE.",
    openingDirective:
      "ROUND 1: SCAN, then alternate ADVANCE and RETREAT to distort their reads.",
    triggerSlots: [
      {
        condition: { source: "PREVIOUS_ENEMY_ACTION", operator: "=", value: "DEFEND" },
        directive: "CHARGE now; their guard is set for a feint, not a rush.",
      },
      {
        condition: { source: "DISTANCE_CATEGORY", operator: "=", value: "MEDIUM" },
        directive: "Vary ADVANCE and RETREAT until the burst window opens.",
      },
      {
        condition: { source: "ENEMY_ENERGY", operator: "<", value: 50, unit: "percent" },
        directive: "They cannot afford pursuit: RANGED_ATTACK from LONG.",
      },
    ],
    emergency: {
      hpThresholdPercent: 25,
      directive: "Vanish: RETREAT hard, DODGE everything, and win on HP at the ROUND limit.",
    },
    accent: "#c07ae0",
  },
];

// Sources that carry a unit per SPEC §45 (HP and Energy only).
const UNIT_SOURCES: readonly TriggerSource[] = [
  "OWN_HP",
  "OWN_ENERGY",
  "ENEMY_HP",
  "ENEMY_ENERGY",
];

export function conditionSourceHasUnit(source: TriggerSource): boolean {
  return UNIT_SOURCES.includes(source);
}

const HP_SOURCES: readonly TriggerSource[] = ["OWN_HP", "ENEMY_HP"];

export function conditionSourceIsHp(source: TriggerSource): boolean {
  return HP_SOURCES.includes(source);
}

function isScanStateSource(source: TriggerSource): source is ScanStateSource {
  return source.startsWith("KNOWN_") || source.startsWith("UNKNOWN_");
}

// Canonical trigger text, e.g. "OWN HP < 25%" or "MELEE_WEAPON UNKNOWN".
export function formatCondition(condition: TriggerCondition): string {
  const { source, operator, value, unit } = condition;

  if (isScanStateSource(source)) {
    const state = source.startsWith("KNOWN_") ? "KNOWN" : "UNKNOWN";
    return `${source.slice(state.length + 1)} ${state}`;
  }

  switch (source) {
    case "OWN_HP":
    case "ENEMY_HP":
    case "OWN_ENERGY":
    case "ENEMY_ENERGY": {
      const label = source.endsWith("HP") ? "HP" : "ENERGY";
      const who = source.startsWith("OWN") ? "OWN" : "ENEMY";
      const suffix = unit === "percent" ? "%" : "";
      return `${who} ${label} ${operator} ${String(value)}${suffix}`;
    }
    case "DISTANCE":
      return `DISTANCE ${operator} ${String(value)} m`;
    case "DISTANCE_CATEGORY":
      return `DISTANCE_CATEGORY ${operator} ${String(value)}`;
    case "CURRENT_ROUND":
      return `ROUND ${operator} ${String(value)}`;
    case "INITIATIVE":
      return `INITIATIVE ${operator} ${String(value)}`;
    case "PREVIOUS_ENEMY_ACTION":
      return `ENEMY LAST ACTION ${operator} ${String(value)}`;
  }
}

// Compact trigger line for cards: "WHEN OWN HP < 25% → directive".
export function formatTrigger(slot: TriggerSlot): string {
  return `WHEN ${formatCondition(slot.condition)} → ${slot.directive}`;
}
