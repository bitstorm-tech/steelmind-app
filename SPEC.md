# Steelmind — MVP Product & Technical Specification

**Version:** 1.0  
**Status:** Ready for initial implementation  
**Working title:** Steelmind  
**Platform:** Web  
**Primary goal:** Validate the core gameplay loop:

> Choose a Brain → Watch it fight → Understand its mistakes → Tune the Brain → Rematch

---

# 1. Product Vision

Steelmind is a turn-based mech combat game in which players do not directly control their mechs.

Each player configures the **Brain** controlling a multi-ton combat mech.

A Brain consists of short natural-language directives and deterministic trigger conditions.

During every combat round, an LLM receives the current observable game state together with the Brain configuration and selects two ordered actions.

The game engine executes those actions according to deterministic combat rules.

The LLM:

> decides what the mech wants to do.

The Game Engine:

> decides what actually happens.

The player observes the result and modifies the Brain.

---

# 2. Core Product Hypothesis

The MVP exists to test one question:

> Is it fun to optimize the behavior of an autonomous LLM-controlled combat mech?

The strongest success signal is repeated execution of:

```text
FIGHT
  ↓
OBSERVE
  ↓
EDIT BRAIN
  ↓
REMATCH
```

Everything not required to test this loop should be deferred.

---

# 3. MVP Scope

Included:

- large sci-fi combat mechs,
- turn-based combat,
- two actions per mech and round,
- melee combat,
- ranged combat,
- movement,
- Energy management,
- scanning,
- hidden opponent attributes,
- configurable LLM Brain,
- predefined starter Brains,
- AI vs AI,
- match replay data,
- 3D visualization.

Not included:

- individual mech parts,
- MechLab,
- weight calculations,
- configurable engines,
- configurable armor modules,
- inventory,
- crafting,
- terrain effects,
- free player-controlled movement,
- skill trees,
- progression,
- ranked matchmaking,
- tournaments,
- clans,
- Steam client,
- native mobile applications.

## Match Modes

During MVP development:

```text
DEVELOPER SANDBOX
```

The developer selects both mechs, Brains, and Combat Profiles manually.
Any Brain can occupy either side.

Planned for the finished game:

- PvP: two players face each other with their Brains.
- Self-Test: a player pits two of their own Brains against each other to refine tactics.

Combat rules are identical in every mode.

---

# 4. Technology Stack

## Frontend

- Vue 3
- TypeScript
- Vite
- Three.js

Three.js is visualization only.

It must never determine:

- combat positions,
- collisions,
- attack hits,
- damage,
- movement distance,
- game state.

---

## Backend

- Bun
- Hono
- Zod
- PostgreSQL
- Bun SQL
- Server-Sent Events

LLM providers are accessed through a provider abstraction.

---

# 5. Monorepo

```text
steelmind/
├── apps/
│   ├── web/
│   └── server/
│
├── packages/
│   ├── game-engine/
│   ├── game-types/
│   └── brain-engine/
│
├── package.json
├── tsconfig.json
└── README.md
```

## game-types

Shared domain types and Zod schemas.

Examples:

```text
Action
Brain
BrainTrigger
Mech
CombatProfile
GameState
Round
Match
CombatEvent
ScanResult
LLMDecision
```

No dependency on:

- Vue,
- Hono,
- Three.js,
- database code,
- provider SDKs.

---

## game-engine

Pure combat simulation.

Input:

```text
GameState
Mech A planned actions
Mech B planned actions
Random seed
```

Output:

```text
Updated GameState
CombatEvents
```

Must contain no:

- HTTP,
- database access,
- LLM calls,
- Three.js code,
- network requests.

---

## brain-engine

Responsible for:

- Brain validation,
- trigger evaluation,
- directive priority,
- gameplay keyword detection,
- LLM context creation,
- LLM response validation,
- provider-independent decision handling.

---

# 6. Mech Fantasy

Steelmind mechs are large military machines weighing many tons.

They should feel closer to BattleMechs than humanoid robots.

Visual direction:

- massive,
- heavy,
- industrial,
- military,
- slow acceleration,
- huge weapons,
- impactful movement,
- destructive attacks.

The Game Engine is independent of animation speed.

---

# 7. Combat Overview

Combat is round based.

Each round gives each mech:

```text
2 Action Slots
```

Both Brains plan both actions before execution begins.

Example:

```text
RAVEN

Slot 1: CHARGE
Slot 2: MELEE_ATTACK
```

```text
ATLAS

Slot 1: RETREAT
Slot 2: RANGED_ATTACK
```

After both Brains have made their decisions, actions execute sequentially.

---

# 8. Round Lifecycle

At the start of every round:

```text
1. Regenerate Energy
2. Remove round-scoped effects from previous round
3. Determine current Initiative
4. Build Brain contexts
5. Query both Brains concurrently
6. Both Brains select two ordered actions
7. Resolve Action Slot 1
8. Resolve Action Slot 2
9. Check destruction
10. Check match end
11. Switch Initiative
```

Maximum:

```text
30 rounds
```

---

# 9. Initiative

Combat planning is simultaneous.

Combat execution is sequential.

One mech owns Initiative for the current round.

If Mech A owns Initiative:

```text
A1
B1
A2
B2
```

If Mech B owns Initiative:

```text
B1
A1
B2
A2
```

Initial Initiative is chosen using the match's seeded RNG.

Initiative then alternates every round.

Example:

```text
Round 1 → Raven
Round 2 → Atlas
Round 3 → Raven
...
```

Future mech modules or mobility systems may influence Initiative.

They do not do so in the MVP.

---

# 10. Destruction During a Round

A mech destroyed during a round still executes all actions it planned for that round.

Example:

```text
Raven A1 destroys Atlas.

Atlas B1 still executes.
Raven A2 executes.
Atlas B2 still executes.
```

Only after all four planned actions have executed is destruction evaluated.

This allows:

```text
DOUBLE K.O.
```

If both mechs have:

```text
HP <= 0
```

after the round:

```text
DRAW
```

---

# 11. Arena

Combat uses continuous positioning.

There is no grid.

The combat simulation is one-dimensional for the MVP.

Example:

```text
0m ───────────────────────────────────────── 120m
```

Internal positions are stored as integer meters.

Example:

```text
position = 34 m
```

Do not use floating-point positions in authoritative combat calculations.

Initial arena length:

```text
120 m
```

Initial starting positions:

```text
Mech A: 30 m
Mech B: 90 m
```

Initial distance:

```text
60 m
```

---

# 12. Distance

Actual distance is calculated continuously.

Example:

```text
DISTANCE = 24 m
```

Three semantic categories also exist:

```text
CLOSE   <= 10 m
MEDIUM  > 10 m and <= 30 m
LONG    > 30 m
```

The Brain receives both:

```text
DISTANCE: 24 m
DISTANCE_CATEGORY: MEDIUM
```

Gameplay directives may reference either concept.

---

# 13. Mech Collision

Mechs may never move through one another.

If movement would cause their positions to cross:

```text
DISTANCE = 0
```

The movement stops at the opposing mech.

The mechs are considered:

```text
FACE_TO_FACE
```

---

# 14. Action System

Every mech chooses exactly:

```text
2 actions per round
```

Every MVP action costs:

```text
1 Action Slot
```

There is no distinction between:

- movement slots,
- attack slots,
- utility slots.

Any combination is allowed.

Examples:

```text
ADVANCE + ADVANCE
RETREAT + RETREAT
CHARGE + MELEE_ATTACK
MELEE_ATTACK + MELEE_ATTACK
RANGED_ATTACK + RETREAT
SCAN + SCAN
DEFEND + DODGE
DEFEND + DEFEND
DODGE + DODGE
```

---

# 15. MVP Actions

```text
ADVANCE
RETREAT
CHARGE

MELEE_ATTACK
RANGED_ATTACK

DEFEND
DODGE
SCAN
```

These are the only actions available in MVP combat.

---

# 16. Energy

Every mech has:

```text
Maximum Energy: 100
Starting Energy: 100
```

Automatic regeneration happens at the beginning of every round:

```text
+10 ENERGY
```

Energy cannot exceed:

```text
100
```

Energy regeneration is not an action.

Future reactors and modules may alter regeneration.

---

# 17. Initial Combat Balancing

All values are centralized configuration constants.

They must not be scattered through game logic.

Initial values:

| Action | Energy | Effect |
|---|---:|---|
| `ADVANCE` | 0 | move toward enemy |
| `RETREAT` | 0 | move away from enemy |
| `CHARGE` | 20 | rapid advance + ENGAGE |
| `MELEE_ATTACK` | weapon dependent | melee damage |
| `RANGED_ATTACK` | weapon dependent | ranged damage |
| `DEFEND` | 4 | +25 percentage points defense |
| `DODGE` | 6 | +15/+20 percentage points dodge |
| `SCAN` | 10 | reveal one unknown attribute |

These are starting values only.

---

# 18. ADVANCE

```text
ADVANCE
```

Moves toward the opponent.

Movement distance depends on Mobility.

Initial mobility values are defined by Combat Profiles.

Default / medium value:

```text
10 m
```

Energy:

```text
0
```

Movement stops at the opponent.

---

# 19. RETREAT

```text
RETREAT
```

Moves directly away from the opponent.

Movement distance depends on Mobility.

Default / medium value:

```text
10 m
```

Energy:

```text
0
```

Movement is constrained by arena boundaries.

A mech cannot retreat beyond:

```text
0 m
or
120 m
```

If the mech is not yet at the boundary,
the movement is clamped and RETREAT succeeds with reduced distance.

If the mech is already exactly at the boundary,
RETREAT fails:

```text
ARENA_BOUNDARY
```

---

# 20. CHARGE

CHARGE is the primary anti-kiting mechanic.

```text
CHARGE
```

Energy:

```text
20
```

Movement distance:

```text
Mobility × 2.5
```

Examples:

```text
LOW mobility:
8 m normal movement
20 m CHARGE

MEDIUM:
10 m normal
25 m CHARGE

HIGH:
12 m normal
30 m CHARGE
```

If the CHARGE reaches the opponent:

```text
DISTANCE = 0
```

and the target receives:

```text
ENGAGED
```

for the remainder of the current round.

CHARGE itself causes:

```text
0 damage
```

CHARGE has no range restriction:

- it always executes,
- from DISTANCE 0 it connects immediately,
- Energy is consumed on execution.

Insufficient Energy remains a normal execution-time failure.

---

# 21. ENGAGED

ENGAGED represents a mech being physically pinned into close combat.

ENGAGED lasts:

```text
until the end of the current round
```

While ENGAGED:

```text
ADVANCE → fails
RETREAT → fails
```

All other actions remain possible:

```text
CHARGE
MELEE_ATTACK
RANGED_ATTACK
DEFEND
DODGE
SCAN
```

Only the target of a CHARGE becomes ENGAGED.

The charging mech is never pinned and can still move freely.

Normal RANGED_ATTACK range restrictions still apply.

ENGAGED is automatically removed before the next round.

---

# 22. MELEE_ATTACK

Melee attacks require:

```text
DISTANCE <= 10 m
```

They are otherwise guaranteed to hit unless:

```text
DODGE succeeds
```

Damage and Energy depend on the equipped melee weapon.

If the opponent moves out of melee range before the attack executes:

```text
MELEE_ATTACK fails
```

No Energy is consumed for an execution-time range failure.

The action slot is still consumed.

---

# 23. RANGED_ATTACK

Ranged attacks require:

```text
DISTANCE > 10 m
```

They are otherwise guaranteed to hit unless:

```text
DODGE succeeds
```

Damage and Energy depend on the equipped ranged weapon.

If the opponent enters CLOSE range before execution:

```text
RANGED_ATTACK fails
```

No Energy is consumed for an execution-time range failure.

The action slot is consumed.

---

# 24. DEFEND

Each executed:

```text
DEFEND
```

adds:

```text
+25 percentage points
```

of damage reduction for the remainder of the current round.

Example:

```text
Slot 1: DEFEND
```

Results in:

```text
25% defense
```

for all following attacks in the round.

If:

```text
Slot 1: DEFEND
Slot 2: DEFEND
```

then after the second DEFEND:

```text
50% defense
```

is active.

DEFEND stacks.

Defense resets to zero at the end of the round.

Future modules may improve DEFEND.

---

# 25. DODGE

Each executed:

```text
DODGE
```

adds dodge probability for the remainder of the current round.

Against ranged attacks:

```text
+15 percentage points
```

Against melee attacks:

```text
+20 percentage points
```

The additional 5 percentage points represent improved close-range anticipation.

Example:

```text
DODGE + DODGE
```

results after the second action in:

```text
RANGED dodge chance: 30%
MELEE dodge chance:  40%
```

Every incoming attack performs an independent dodge roll.

DODGE resets at the end of the round.

All dodge rolls use seeded RNG.

---

# 26. Attack Resolution

For every attack:

```text
1. Validate range
2. Validate Energy
3. Roll DODGE
4. If dodge succeeds:
      damage = 0
5. Otherwise:
      calculate weapon base damage
6. Apply passive Armor reduction
7. Apply active DEFEND reduction
8. Round final damage to nearest integer
9. Subtract HP
10. Emit combat events
```

Damage reduction is multiplicative.

Example:

```text
Base Damage:       24
Armor Reduction:   10%
DEFEND Reduction:  25%

24 × 0.90 × 0.75
= 16.2
= 16 Damage
```

---

# 27. SCAN

```text
SCAN
```

costs:

```text
10 Energy
```

and one action slot.

SCAN reveals:

```text
one random currently unknown opponent attribute
```

The attribute remains known for the rest of the match.

All future LLM contexts include the discovered information.

If no unknown attributes remain:

```text
SCAN fails
```

and consumes no Energy.

---

# 28. Always-Known Information

Both mechs always know:

```text
OWN HP
ENEMY HP

OWN ENERGY
ENEMY ENERGY

DISTANCE
DISTANCE_CATEGORY

CURRENT ROUND

CURRENT INITIATIVE

ALL EXECUTED ENEMY ACTIONS
```

These values never require scanning.

Failed enemy actions are included.

Failed actions are visible, including which action failed.

---

# 29. Initially Hidden Information

At match start, the opponent's following attributes are unknown:

```text
MELEE_WEAPON
RANGED_WEAPON
ARMOR_CLASS
MOBILITY
```

Each SCAN reveals one of these four attributes.

After four successful unique scans:

```text
all opponent combat attributes are known
```

---

# 30. Weapon Observation

Using a weapon does not automatically reveal its identity or statistics.

Example:

The Brain may observe:

```text
Enemy used RANGED_ATTACK.
```

It does not automatically learn:

```text
Enemy weapon: RAILGUN
Damage: 20
Energy cost: 16
```

That requires SCAN.

---

# 31. MVP Combat Profiles

The MVP does not contain configurable mech parts.

Instead, players select one predefined Combat Profile.

Profiles provide meaningful hidden attributes for SCAN while avoiding MechLab complexity.

Each profile also defines its Hit Points.

HP is always-known information and never requires scanning.

Initial profiles:

## BRAWLER

```text
Armor:    HEAVY
Mobility: LOW
HP:       220

Melee:    POWER_HAMMER
Ranged:   AUTOCANNON
```

## ASSAULT

```text
Armor:    MEDIUM
Mobility: MEDIUM
HP:       200

Melee:    ENERGY_BLADE
Ranged:   RAILGUN
```

## SKIRMISHER

```text
Armor:    LIGHT
Mobility: HIGH
HP:       180

Melee:    IMPACT_FIST
Ranged:   PULSE_LASER
```

These are complete presets.

Players do not change individual components.

---

# 32. Mobility

Initial values:

```text
LOW:
8 m normal movement
20 m CHARGE

MEDIUM:
10 m normal movement
25 m CHARGE

HIGH:
12 m normal movement
30 m CHARGE
```

Mobility does not affect Initiative in MVP.

---

# 33. Armor

Initial passive damage reduction:

```text
LIGHT:
0%

MEDIUM:
6%

HEAVY:
12%
```

Armor reduction applies before DEFEND reduction.

---

# 34. Melee Weapons

Initial values:

## POWER_HAMMER

```text
Damage: 28
Energy: 16
Range: CLOSE
```

## ENERGY_BLADE

```text
Damage: 24
Energy: 12
Range: CLOSE
```

## IMPACT_FIST

```text
Damage: 20
Energy: 8
Range: CLOSE
```

---

# 35. Ranged Weapons

Initial values:

## AUTOCANNON

```text
Damage: 16
Energy: 10
Range: > 10 m
```

## RAILGUN

```text
Damage: 20
Energy: 16
Range: > 10 m
```

## PULSE_LASER

```text
Damage: 13
Energy: 7
Range: > 10 m
```

All weapon values are balancing constants.

No ammunition exists in MVP.

---

# 36. Planned Action vs Executable Action

This distinction is essential.

Brains plan both actions using the state at the beginning of the round.

The world may change before Action 2 executes.

Example:

```text
Initial distance: 8 m

Raven:
MELEE_ATTACK
MELEE_ATTACK

Atlas:
RETREAT
RETREAT
```

A later MELEE_ATTACK may become impossible.

This is not an invalid LLM response.

It is an:

```text
ACTION_FAILED
```

event.

---

# 37. Execution-Time Action Failure

Possible reasons:

```text
TARGET_OUT_OF_RANGE
INSUFFICIENT_ENERGY
ENGAGED (ADVANCE and RETREAT only)
ARENA_BOUNDARY
NOTHING_LEFT_TO_SCAN
```

When an action fails during execution:

```text
Action Slot is consumed.
```

Energy is consumed only when the action actually executes.

No automatic replacement action occurs.

Poor planning is part of gameplay.

---

# 38. Invalid LLM Response

Invalid LLM output is different from an action failing during combat.

An LLM response is invalid when:

- JSON/schema is invalid,
- there are not exactly two actions,
- an unknown action name is returned,
- required fields are missing.

Example invalid action:

```text
FLY
```

Example valid but possibly unsuccessful action:

```text
MELEE_ATTACK
```

even if the enemy might retreat before execution.

---

# 39. LLM Retry Policy

If LLM output is invalid:

```text
Attempt 1
↓
invalid
↓
Attempt 2
↓
invalid
↓
Attempt 3
↓
invalid
↓
fallback
```

Retries receive a concise validation error.

Example:

```text
Invalid action "FLY".
Allowed actions are:
ADVANCE, RETREAT, CHARGE, MELEE_ATTACK,
RANGED_ATTACK, DEFEND, DODGE, SCAN.

Return exactly two actions.
```

After three failed attempts:

```text
DEFEND
DEFEND
```

is used.

Provider timeouts, network errors, and outages are out of scope for the MVP.

The retry policy covers invalid model output only.

---

# 40. Match End

Normal victory:

```text
Opponent HP <= 0
```

evaluated after the current round has completely executed.

If both mechs reach:

```text
HP <= 0
```

during the same round:

```text
DRAW
```

---

# 41. Round Limit

Maximum:

```text
30 rounds
```

After Round 30:

```text
1. Higher remaining HP wins.
2. If HP equal, higher remaining ENERGY wins.
3. If Energy also equal, DRAW.
```

---

# 42. Brain Structure

Every Brain contains exactly:

```text
CORE DIRECTIVE

OPENING DIRECTIVE

TRIGGER SLOT 1
TRIGGER SLOT 2
TRIGGER SLOT 3

EMERGENCY PROTOCOL
```

Memory is explicitly not part of the MVP.

---

# 43. Core Directive

Always active.

Purpose:

```text
general combat philosophy
```

Maximum:

```text
200 characters
```

Example:

```text
Maintain DISTANCE and preserve ENERGY.
Prefer RANGED_ATTACK unless forced into CLOSE combat.
```

---

# 44. Opening Directive

Active during:

```text
Rounds 1–3
```

Maximum:

```text
140 characters
```

Example:

```text
Use SCAN early and avoid CHARGE before understanding the opponent.
```

---

# 45. Trigger Slots

Three Trigger Slots exist.

Each consists of:

```text
Condition
Directive
```

Conditions are deterministic UI configuration.

The condition is not natural-language text.

MVP conditions use one condition only.

No AND/OR expressions yet.

Each condition consists of:

```text
SOURCE
OPERATOR
VALUE
UNIT
```

Operators:

```text
<  <=  =  >=  >  !=
```

HP and Energy conditions support two units:

```text
absolute:  OWN HP < 50
percent:   OWN HP < 25%
```

The player selects the unit in the UI.

Example:

```text
WHEN:
OWN ENERGY < 25%

DIRECTIVE:
Prefer DEFEND and avoid expensive CHARGE actions.
```

Maximum directive:

```text
120 characters
```

---

# 46. Trigger Condition Sources

Initial options:

```text
OWN HP
OWN ENERGY

ENEMY HP
ENEMY ENERGY

DISTANCE
DISTANCE_CATEGORY

CURRENT ROUND

INITIATIVE

PREVIOUS_ENEMY_ACTION

KNOWN / UNKNOWN:
MELEE_WEAPON
RANGED_WEAPON
ARMOR_CLASS
MOBILITY
```

PREVIOUS_ENEMY_ACTION is the enemy's most recently executed action.

Failed actions count.

---

# 47. Emergency Protocol

Fixed trigger type:

```text
WHEN OWN HP < configured threshold
```

Player configures:

```text
HP threshold
Directive
```

Maximum:

```text
140 characters
```

Example:

```text
Take maximum risks. Use CHARGE to engage and prioritize MELEE_ATTACK.
```

---

# 48. Directive Priority

The Brain assembler applies priority as follows:

```text
1. EMERGENCY PROTOCOL
2. TRIGGER SLOT 1
3. TRIGGER SLOT 2
4. TRIGGER SLOT 3
5. OPENING DIRECTIVE
6. CORE DIRECTIVE
```

All applicable directives are included.

Higher-priority directives explicitly override conflicting lower-priority directives.

Trigger Slot 1 is therefore the highest-priority normal Trigger.

The UI must make this ordering visible.

---

# 49. Prompt Length Limits

```text
Core:       200
Opening:    140
Trigger:    120 each
Emergency:  140
```

Limits are measured in characters.

The UI displays:

```text
83 / 120
```

Text beyond the limit is rejected.

---

# 50. Gameplay Keywords

Recognized keywords initially include:

## Actions

```text
ADVANCE
RETREAT
CHARGE
MELEE_ATTACK
RANGED_ATTACK
DEFEND
DODGE
SCAN
```

## Resources / State

```text
HP
ENERGY
DISTANCE
INITIATIVE
ROUND
```

## Distance

```text
CLOSE
MEDIUM
LONG
```

## Scan Attributes

```text
MELEE_WEAPON
RANGED_WEAPON
ARMOR_CLASS
MOBILITY
```

---

# 51. Keyword Editor Behavior

Keywords must support:

- syntax highlighting,
- autocomplete,
- tooltip/help text,
- validation.

Every directive must reference at least one recognized gameplay keyword.

Invalid:

```text
Fight intelligently and make clever decisions.
```

Valid:

```text
Preserve ENERGY and use CHARGE only when necessary.
```

Do not provide:

```text
Optimize my prompt with AI
```

Prompt writing is part of the game.

---

# 52. Starter Brains

New players must never begin with an empty Brain.

Initial starter archetypes:

```text
BERSERKER
SENTINEL
OPPORTUNIST
TECHNICIAN
TRICKSTER
```

Every starter is a complete valid Brain.

A player can immediately:

```text
Choose Brain
→ Choose Combat Profile
→ Fight
```

Afterward:

```text
Edit Brain
→ Rematch
```

Starter Brains are copied when customized.

The original template remains unchanged.

---

# 53. LLM Input

Each Brain receives a structured combat context containing:

```text
ROUND

INITIATIVE

OWN:
HP
ENERGY
Combat Profile information

ENEMY:
HP
ENERGY

DISTANCE
DISTANCE_CATEGORY

KNOWN ENEMY ATTRIBUTES

UNKNOWN ENEMY ATTRIBUTES

ALL EXECUTED ENEMY ACTIONS

AVAILABLE GAME ACTIONS
ACTION COSTS
ACTION RULES

CORE DIRECTIVE
OPENING DIRECTIVE if active
ACTIVE TRIGGERS
EMERGENCY PROTOCOL if active
```

The LLM does not receive hidden enemy attributes.

---

# 54. LLM Output

The LLM returns exactly:

```json
{
  "actions": [
    "CHARGE",
    "MELEE_ATTACK"
  ]
}
```

Optionally:

```json
{
  "actions": [
    "CHARGE",
    "MELEE_ATTACK"
  ],
  "reason": "The opponent is retreating and must be engaged."
}
```

The tactical reason:

- is optional,
- must be very short,
- must have a strict output limit,
- must not request hidden chain-of-thought.

---

# 55. Managed AI

Normal players must not require API knowledge.

Default mode:

```text
ARENA AI
```

Steelmind provides the model and pays inference costs.

Players later consume:

```text
Arena Credits
```

Payment implementation is not required for the first internal prototype.

---

# 56. BYOK

Advanced users may eventually use:

```text
Bring Your Own Key
```

Initial intended provider:

```text
OpenRouter
```

Game logic must never depend on OpenRouter directly.

Provider interface example:

```ts
interface LLMProvider {
  decide(context: BrainContext): Promise<LLMDecision>;
}
```

BYOK can be implemented after the full managed-AI combat loop works.

---

# 57. Match Events

The Game Engine emits presentation-independent events.

Examples:

```text
MATCH_STARTED
ROUND_STARTED

ENERGY_REGENERATED

ACTION_STARTED
ACTION_FAILED

MECH_ADVANCED
MECH_RETREATED

CHARGE_STARTED
CHARGE_CONNECTED
MECH_ENGAGED

MELEE_ATTACK
RANGED_ATTACK

ATTACK_DODGED
ATTACK_HIT

DEFEND_ACTIVATED
DODGE_ACTIVATED

SCAN_STARTED
SCAN_COMPLETED

DAMAGE_TAKEN

MECH_DESTROYED

ROUND_COMPLETED
MATCH_COMPLETED
```

Events must contain enough information to recreate the entire fight visually.

---

# 58. Replay

A replay must never rerun LLM decisions.

Persist:

```text
initial GameState
random seed
Combat Profile snapshots
Brain snapshots
LLM decisions
scan results
CombatEvents
final result
```

Replays consume recorded events only.

## Match Delivery

During MVP development, matches run live:
the server simulates round by round and streams events via SSE.

The finished game gains a second mode:

```text
OFFLINE MATCH
```

The server simulates the entire match in one pass without spectators.

Players watch only the stored replay.

Both modes produce identical replay data.

---

# 59. Determinism

Given identical:

```text
initial state
combat profiles
actions
random seed
```

the Game Engine must produce identical results.

All combat randomness uses an explicit seeded RNG.

Never use:

```ts
Math.random()
```

inside authoritative combat logic.

---

# 60. Frontend MVP Screens

Required:

## Brain Selection

Select starter Brain.

## Combat Profile Selection

```text
BRAWLER
ASSAULT
SKIRMISHER
```

No component editor.

## Brain Editor

Displays:

```text
CORE DIRECTIVE
OPENING DIRECTIVE
TRIGGER 1
TRIGGER 2
TRIGGER 3
EMERGENCY PROTOCOL
```

With:

- character counters,
- keyword highlighting,
- autocomplete,
- validation,
- trigger condition controls.

## Match Screen

Displays:

- two 3D mechs,
- HP,
- Energy,
- exact distance,
- distance category,
- round number,
- Initiative,
- combat events,
- scan discoveries,
- short tactical explanations.

## Result

```text
WIN
LOSS
DRAW

REMATCH
EDIT BRAIN
```

---

# 61. Persistence

Minimum persisted concepts:

```text
Brain
Match
MatchParticipant
CombatEvent
```

Authentication is not required for Milestone 1–5.

Anonymous/local development identities are acceptable initially.

Brains and Combat Profile selections must be snapshotted into Matches.

Editing a Brain must never change historical match data.

---

# 62. Testing

The Game Engine requires meaningful unit tests for:

- exact integer meter positioning,
- ADVANCE,
- RETREAT,
- arena boundaries,
- collision,
- distance categories,
- CHARGE,
- ENGAGED,
- Initiative,
- alternating Initiative,
- action sequencing,
- destruction during a round,
- double KO,
- melee range,
- ranged range,
- Energy consumption,
- Energy regeneration,
- insufficient Energy,
- DEFEND stacking,
- DODGE stacking,
- seeded dodge rolls,
- armor reduction,
- scan selection,
- scan uniqueness,
- scan exhaustion,
- hidden information,
- action failure,
- 30-round limit,
- HP tiebreak,
- Energy tiebreak,
- deterministic replay.

Brain Engine tests:

- character limits,
- keyword detection,
- trigger evaluation,
- trigger priority,
- Opening activation,
- Emergency activation,
- LLM schema validation,
- retry behavior,
- DEFEND + DEFEND fallback.

---

# 63. Coding Principles

Prefer:

```text
KISS
small modules
explicit control flow
strong TypeScript types
pure game logic
meaningful tests
```

Avoid:

```text
microservices
Redis
Kafka
CQRS
dependency injection frameworks
generic repository abstractions
event-bus architecture
premature scalability work
unnecessary design patterns
```

Do not implement speculative infrastructure.

---

# 64. Implementation Milestones

## Milestone 1 — Pure Combat Engine

Implement:

- positions,
- distance,
- Combat Profiles,
- HP,
- Energy,
- Initiative,
- two-action planning,
- sequential execution,
- all eight actions,
- CHARGE/ENGAGED,
- weapons,
- armor,
- mobility,
- scanning,
- seeded randomness,
- match end,
- tests.

No:

- HTTP,
- database,
- LLM,
- Vue,
- Three.js.

Provide a CLI simulation.

Acceptance criterion:

```text
Two scripted mechs can complete a deterministic 30-round-or-less fight entirely inside game-engine.
```

---

## Milestone 2 — Brain Engine

Implement:

- Brain model,
- directives,
- character limits,
- keywords,
- trigger conditions,
- priority,
- context assembler,
- LLM decision schema,
- fake deterministic Brain.

Acceptance criterion:

```text
Two fake Brains can independently produce two-action plans for every round.
```

---

## Milestone 3 — Real LLM

Implement:

- provider abstraction,
- one managed provider,
- structured output,
- retries,
- fallback,
- concurrent Brain calls.

Acceptance criterion:

```text
Two real LLM Brains can autonomously complete a match.
```

---

## Milestone 4 — Server

Implement:

- Bun,
- Hono,
- PostgreSQL,
- Bun SQL,
- Brain CRUD,
- create match,
- retrieve match,
- SSE match stream,
- persistence,
- replay data.

Acceptance criterion:

```text
A client can create a match and receive the entire fight as SSE events.
```

---

## Milestone 5 — Minimal Vue UI

Implement:

- starter Brain selection,
- Combat Profile selection,
- Brain editor,
- match start,
- textual/2D event viewer,
- result screen,
- Edit Brain,
- Rematch.

Do not implement the 3D match scene yet.

Acceptance criterion:

```text
The complete core loop is playable without 3D.
```

---

## Milestone 6 — 3D Match Scene (Three.js)

Implement:

- arena,
- heavy mech models,
- movement,
- retreat,
- charge,
- melee attack,
- ranged attack,
- defend,
- dodge,
- scan,
- hit reactions,
- destruction,
- cameras,
- combat HUD.

The Three.js scene consumes CombatEvents.

Acceptance criterion:

```text
A stored replay can be visually reproduced without invoking the Game Engine or an LLM.
```

---

## Milestone 7 — MVP Polish

Implement:

- onboarding,
- starter Brain tuning,
- match readability,
- improved tactical explanations,
- replay UX,
- challenge/rematch flow,
- initial analytics.

---

# 65. Architecture Invariant

This rule must never be violated:

```text
BRAIN / LLM
decides

↓

GAME ENGINE
resolves

↓

COMBAT EVENTS
describe

↓

THREE.JS
visualizes
```

The LLM never determines damage.

The frontend never determines game state.

Three.js never determines collisions.

The Game Engine never calls an LLM.

The Brain Engine never renders combat.

---

# 66. Primary MVP Metric

The most important behavioral event sequence to measure is:

```text
MATCH_COMPLETED
↓
BRAIN_EDITED
↓
REMATCH_STARTED
```

If players repeatedly perform this sequence voluntarily, Steelmind's core hypothesis is validated.
