import { parseArgs } from "node:util";
import { ProfileIdSchema, type CombatEvent } from "@steelmind/game-types";
import { describeResult, runMatch, SCRIPTED_PLANNERS, type ScriptedPlannerId } from "./simulate";

// CLI simulation of two scripted mechs (SPEC §64, Milestone 1).
//   bun run simulate -- --seed 7 --a BRAWLER --b SKIRMISHER --planner-a brawler --planner-b kiter

const { values } = parseArgs({
  options: {
    seed: { type: "string", default: "1" },
    a: { type: "string", default: "BRAWLER" },
    b: { type: "string", default: "SKIRMISHER" },
    "planner-a": { type: "string", default: "brawler" },
    "planner-b": { type: "string", default: "kiter" },
    quiet: { type: "boolean", default: false },
  },
});

function plannerId(value: string): ScriptedPlannerId {
  if (value in SCRIPTED_PLANNERS) return value as ScriptedPlannerId;
  throw new Error(`Unknown planner "${value}". Use one of: ${Object.keys(SCRIPTED_PLANNERS).join(", ")}`);
}

const { state, events } = runMatch(
  {
    seed: Number(values.seed),
    profiles: { A: ProfileIdSchema.parse(values.a), B: ProfileIdSchema.parse(values.b) },
  },
  {
    A: SCRIPTED_PLANNERS[plannerId(values["planner-a"])],
    B: SCRIPTED_PLANNERS[plannerId(values["planner-b"])],
  },
);

function format(event: CombatEvent): string | null {
  switch (event.type) {
    case "MATCH_STARTED":
      return `MATCH seed=${event.seed} initiative=${event.initiative} ${event.mechs
        .map((m) => `${m.side}:${m.profileId}@${m.position}m`)
        .join(" ")}`;
    case "ROUND_STARTED":
      return `\n── Round ${event.round} (initiative ${event.initiative})`;
    case "ACTION_STARTED":
      return `  ${event.side}${event.slot} ${event.action}`;
    case "ACTION_FAILED":
      return `     ✗ failed: ${event.reason}`;
    case "MECH_ADVANCED":
    case "MECH_RETREATED":
    case "CHARGE_STARTED":
      return `     ${event.from}m → ${event.to}m`;
    case "CHARGE_CONNECTED":
      return `     connects, ${event.target} ENGAGED`;
    case "ATTACK_DODGED":
      return `     dodged (${event.dodgeChancePct}%)`;
    case "ATTACK_HIT":
      return `     hit for ${event.damage} (base ${event.baseDamage}, armor ${event.armorReductionPct}%, defend ${event.defendReductionPct}%)`;
    case "SCAN_COMPLETED":
      return `     revealed ${event.attribute} = ${event.value}`;
    case "MECH_DESTROYED":
      return `  ☠ ${event.side} destroyed`;
    case "ROUND_COMPLETED":
      return `  = ${event.mechs.map((m) => `${m.side} ${m.hp}HP ${m.energy}EN @${m.position}m`).join(" | ")}`;
    default:
      return null;
  }
}

if (!values.quiet) {
  for (const event of events) {
    const line = format(event);
    if (line !== null) console.log(line);
  }
  console.log();
}
console.log(describeResult(state));
