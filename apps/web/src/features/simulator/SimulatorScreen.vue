<script setup lang="ts">
import { getDistanceCategory } from "@steelmind/game-engine";
import { MECH_SIDES, type MechSide } from "@steelmind/game-types";
import { computed, onBeforeUnmount, onMounted, reactive, shallowRef } from "vue";
import { STARTER_BRAINS } from "../brain-selection/brains";
import { COMBAT_PROFILES } from "../profile-selection/profiles";
import {
  FAILURE_LABELS,
  RESULT_LABELS,
  runSimulation,
  type Loadout,
  type SimulationLog,
} from "./simulation";

// Simulator bay: pick two Brains and two chassis, run a full match locally
// and read it back as a round-by-round combat log.

const props = defineProps<{
  initial?: Partial<Record<MechSide, Loadout | undefined>> | undefined;
}>();

const emit = defineEmits<{ back: [] }>();

const loadouts = reactive<Record<MechSide, Loadout>>({
  A: props.initial?.A ?? { brainId: "BERSERKER", profileId: "BRAWLER" },
  B: props.initial?.B ?? { brainId: "TECHNICIAN", profileId: "SKIRMISHER" },
});
const seed = shallowRef(1);
const log = shallowRef<SimulationLog | null>(null);
// Loadouts the current log was run with; edits after a run do not relabel it.
const ran = shallowRef<Record<MechSide, Loadout> | null>(null);

function brainOf(side: MechSide, source = loadouts) {
  return STARTER_BRAINS.find((b) => b.id === source[side].brainId)!;
}

function profileOf(side: MechSide, source = loadouts) {
  return COMBAT_PROFILES.find((p) => p.id === source[side].profileId)!;
}

function run(): void {
  const setup = { seed: Math.trunc(seed.value) || 0, loadouts: { A: { ...loadouts.A }, B: { ...loadouts.B } } };
  log.value = runSimulation(setup);
  ran.value = setup.loadouts;
}

function reroll(): void {
  seed.value = Math.floor(Math.random() * 1_000_000);
  run();
}

const verdict = computed(() => {
  if (!log.value || !ran.value) return null;
  const { winner, reason, round } = log.value.result;
  const loadout = ran.value;
  return {
    winner,
    headline: winner === null ? "Draw" : `Mech ${winner} wins`,
    detail:
      winner === null
        ? RESULT_LABELS[reason]
        : `${brainOf(winner, loadout).name} on ${profileOf(winner, loadout).name} · ${RESULT_LABELS[reason]}`,
    round,
  };
});

function maxHp(side: MechSide): number {
  return profileOf(side, ran.value ?? loadouts).hp;
}

function pct(value: number, max: number): string {
  return `${Math.max(0, Math.min(100, (value / max) * 100))}%`;
}

function onKeydown(e: KeyboardEvent): void {
  if (e.key === "Escape") emit("back");
}

onMounted(() => window.addEventListener("keydown", onKeydown));
onBeforeUnmount(() => window.removeEventListener("keydown", onKeydown));
</script>

<template>
  <main class="screen">
    <header class="topbar">
      <span class="brand">
        <span class="glyph" aria-hidden="true" />
        Steelmind
      </span>
      <span class="terminal">
        SIM BAY // LOCAL ENGINE <span class="cursor" aria-hidden="true">▮</span>
      </span>
    </header>

    <section class="intro">
      <p class="crumb">DETERMINISTIC SIMULATION — SCRIPTED BRAINS, NO LLM</p>
      <h1 class="title">Combat Simulator</h1>
      <p class="lede">
        Load two mechs, pick a seed and run the full fight in the game engine.
        Brains are stood in for by scripted planners until the Brain Engine is online.
      </p>
    </section>

    <section class="setup" aria-label="Simulation setup">
      <article
        v-for="side in MECH_SIDES"
        :key="side"
        class="bay"
        :class="`side-${side}`"
        :aria-label="`Mech ${side}`"
      >
        <header class="bay-head">
          <span class="side-tag">MECH {{ side }}</span>
          <span class="bay-sum">{{ brainOf(side).name }} · {{ profileOf(side).name }}</span>
        </header>

        <span class="label">BRAIN</span>
        <div class="options brains" role="radiogroup" :aria-label="`Brain for mech ${side}`">
          <button
            v-for="brain in STARTER_BRAINS"
            :key="brain.id"
            type="button"
            role="radio"
            class="opt"
            :class="{ on: loadouts[side].brainId === brain.id }"
            :aria-checked="loadouts[side].brainId === brain.id"
            :style="{ '--opt-accent': brain.accent }"
            @click="loadouts[side].brainId = brain.id"
          >
            <span class="opt-desig">{{ brain.designation }}</span>
            <span class="opt-name">{{ brain.name }}</span>
          </button>
        </div>
        <p class="hint">{{ brainOf(side).role }}</p>

        <span class="label">CHASSIS</span>
        <div class="options profiles" role="radiogroup" :aria-label="`Chassis for mech ${side}`">
          <button
            v-for="profile in COMBAT_PROFILES"
            :key="profile.id"
            type="button"
            role="radio"
            class="opt"
            :class="{ on: loadouts[side].profileId === profile.id }"
            :aria-checked="loadouts[side].profileId === profile.id"
            :style="{ '--opt-accent': profile.accent }"
            @click="loadouts[side].profileId = profile.id"
          >
            <span class="opt-desig">{{ profile.designation }}</span>
            <span class="opt-name">{{ profile.name }}</span>
            <span class="opt-stats">{{ profile.hp }} HP · {{ profile.armor }} · {{ profile.mobility }}</span>
          </button>
        </div>
      </article>

      <div class="controls">
        <label class="seed">
          <span class="label">SEED</span>
          <input v-model.number="seed" type="number" min="0" step="1" inputmode="numeric" />
        </label>
        <button type="button" class="ghost" @click="reroll">RANDOM SEED</button>
        <button type="button" class="go" @click="run">RUN SIMULATION</button>
      </div>
    </section>

    <template v-if="log && verdict && ran">
      <section class="verdict" :class="verdict.winner ? `side-${verdict.winner}` : 'draw'" aria-live="polite">
        <div class="v-main">
          <span class="crumb">RESULT · ROUND {{ verdict.round }} · SEED {{ log.seed }}</span>
          <h2 class="v-head">{{ verdict.headline }}</h2>
          <p class="v-detail">{{ verdict.detail }}</p>
        </div>
        <div class="v-mechs">
          <div v-for="side in MECH_SIDES" :key="side" class="v-mech" :class="`side-${side}`">
            <span class="v-name">
              <b>{{ side }}</b> {{ brainOf(side, ran).name }} / {{ profileOf(side, ran).name }}
            </span>
            <span class="bar hp"><i :style="{ width: pct(log.rounds.at(-1)!.mechs[side].hp, maxHp(side)) }" /></span>
            <span class="v-num">
              {{ log.rounds.at(-1)!.mechs[side].hp }} / {{ maxHp(side) }} HP ·
              {{ log.rounds.at(-1)!.mechs[side].energy }} EN
            </span>
          </div>
        </div>
      </section>

      <section class="log" aria-label="Combat log">
        <p class="log-intro">
          MATCH START · INITIATIVE {{ log.initiative }} · A @ {{ log.start.A.position }} m · B @
          {{ log.start.B.position }} m · ARENA {{ log.arenaLength }} m
        </p>

        <article
          v-for="round in log.rounds"
          :key="round.round"
          class="round"
          :style="{ animationDelay: `${Math.min(round.round, 12) * 30}ms` }"
        >
          <header class="r-head">
            <span class="r-num">R{{ String(round.round).padStart(2, "0") }}</span>
            <span class="chip" :class="`side-${round.initiative}`">INITIATIVE {{ round.initiative }}</span>
            <span class="r-dist">
              {{ round.distance }} m · {{ getDistanceCategory(round.distance) }}
            </span>
          </header>

          <ol class="actions">
            <li
              v-for="entry in round.actions"
              :key="`${entry.slot}${entry.side}`"
              class="act"
              :class="[`side-${entry.side}`, { failed: entry.failure }]"
            >
              <span class="a-side">{{ entry.side }}{{ entry.slot }}</span>
              <span class="a-body">
                <span class="a-line">
                  <span class="a-name">{{ entry.action.replace("_", " ") }}</span>
                  <span v-if="entry.weapon" class="a-weapon">{{ entry.weapon }}</span>
                  <span v-if="entry.failure" class="a-fail">✗ {{ FAILURE_LABELS[entry.failure] }}</span>
                </span>
                <span v-if="entry.details.length" class="a-details">
                  <span v-for="(d, i) in entry.details" :key="i" class="d" :class="d.tone">{{ d.text }}</span>
                </span>
              </span>
              <span class="a-cost">{{ entry.energySpent ? `−${entry.energySpent} EN` : "" }}</span>
            </li>
          </ol>

          <p v-for="side in round.destroyed" :key="side" class="destroyed">☠ MECH {{ side }} DESTROYED</p>

          <footer class="r-status">
            <div class="track" aria-hidden="true">
              <i
                v-for="side in MECH_SIDES"
                :key="side"
                class="pin"
                :class="`side-${side}`"
                :style="{ left: pct(round.mechs[side].position, log.arenaLength) }"
              >{{ side }}</i>
            </div>
            <div class="gauges">
              <div v-for="side in MECH_SIDES" :key="side" class="gauge" :class="`side-${side}`">
                <span class="g-label">{{ side }} · {{ round.mechs[side].position }} m</span>
                <span class="bar hp"><i :style="{ width: pct(round.mechs[side].hp, maxHp(side)) }" /></span>
                <span class="g-num">{{ round.mechs[side].hp }} HP</span>
                <span class="bar en"><i :style="{ width: pct(round.mechs[side].energy, 100) }" /></span>
                <span class="g-num">{{ round.mechs[side].energy }} EN</span>
              </div>
            </div>
          </footer>
        </article>
      </section>
    </template>

    <p v-else class="note">
      AWAITING LAUNCH — CONFIGURE BOTH MECHS AND RUN
      <span class="cursor" aria-hidden="true">▮</span>
    </p>

    <footer class="dock">
      <span class="readout">
        <span class="dock-dot" :class="{ on: log }" aria-hidden="true" />
        {{ brainOf("A").name }} / {{ profileOf("A").name }} VS {{ brainOf("B").name }} / {{ profileOf("B").name }}
      </span>
      <div class="actions-bar">
        <button type="button" class="ghost" @click="emit('back')">BACK</button>
        <button type="button" class="go" @click="run">RUN SIMULATION</button>
      </div>
    </footer>
  </main>
</template>

<style scoped>
.screen {
  --side-A: var(--amber);
  --side-B: #45c4cf;
  display: flex;
  flex-direction: column;
  min-height: 100dvh;
  max-width: 1240px;
  margin: 0 auto;
  padding: 0 clamp(20px, 4vw, 40px);
}

.side-A {
  --side: var(--side-A);
}

.side-B {
  --side: var(--side-B);
}

/* ---- top bar ---- */

.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 18px 0 14px;
  border-bottom: 1px solid var(--line);
  position: relative;
}

.topbar::after {
  content: "";
  position: absolute;
  inset: auto 0 -5px 0;
  height: 3px;
  background: repeating-linear-gradient(-45deg, var(--amber) 0 12px, transparent 12px 24px);
  opacity: 0.35;
}

.brand {
  display: flex;
  align-items: center;
  gap: 12px;
  font-family: var(--font-display);
  font-size: 22px;
  font-weight: 700;
  letter-spacing: 0.22em;
  text-transform: uppercase;
}

.glyph {
  width: 14px;
  height: 14px;
  background: var(--amber);
  clip-path: polygon(0 0, 100% 0, 100% 65%, 65% 100%, 0 100%);
}

.terminal {
  font-family: var(--font-mono);
  font-size: 10.5px;
  letter-spacing: 0.14em;
  color: var(--ink-faint);
}

.cursor {
  color: var(--amber);
  animation: blink 1.1s steps(2, start) infinite;
}

@keyframes blink {
  to {
    visibility: hidden;
  }
}

/* ---- intro ---- */

.intro {
  padding: 40px 0 26px;
  max-width: 680px;
}

.crumb {
  margin: 0 0 10px;
  font-family: var(--font-mono);
  font-size: 10.5px;
  letter-spacing: 0.22em;
  color: var(--amber);
}

.title {
  margin: 0 0 14px;
  font-family: var(--font-display);
  font-size: clamp(38px, 5vw, 54px);
  font-weight: 700;
  line-height: 0.95;
  letter-spacing: 0.03em;
  text-transform: uppercase;
}

.lede {
  margin: 0;
  font-size: 14.5px;
  line-height: 1.55;
  color: var(--ink-dim);
}

.label {
  font-family: var(--font-mono);
  font-size: 9px;
  letter-spacing: 0.18em;
  color: var(--ink-faint);
}

/* ---- setup ---- */

.setup {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(340px, 1fr));
  gap: 22px;
}

.bay {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 16px 18px 18px;
  background: var(--plate);
  border: 1px solid var(--line);
  border-top: 3px solid var(--side);
}

.bay-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 6px;
}

.side-tag {
  font-family: var(--font-display);
  font-size: 28px;
  font-weight: 800;
  letter-spacing: 0.08em;
  color: var(--side);
}

.bay-sum {
  font-family: var(--font-mono);
  font-size: 10.5px;
  letter-spacing: 0.12em;
  color: var(--ink-dim);
  text-transform: uppercase;
}

.options {
  display: grid;
  gap: 6px;
}

.options.brains {
  grid-template-columns: repeat(5, 1fr);
}

.options.profiles {
  grid-template-columns: repeat(3, 1fr);
}

.opt {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 3px;
  min-width: 0;
  padding: 8px 9px;
  text-align: left;
  color: var(--ink-dim);
  background: var(--bg-void);
  border: 1px solid var(--line);
  border-left: 3px solid color-mix(in srgb, var(--opt-accent) 35%, transparent);
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s, color 0.15s;
}

.opt:hover {
  color: var(--ink);
  border-color: var(--line-strong);
}

.opt.on {
  color: var(--ink);
  background: color-mix(in srgb, var(--opt-accent) 12%, var(--bg-void));
  border-color: var(--opt-accent);
  border-left-color: var(--opt-accent);
}

.opt-desig {
  font-family: var(--font-mono);
  font-size: 8.5px;
  letter-spacing: 0.14em;
  color: var(--ink-faint);
}

.opt-name {
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  font-family: var(--font-display);
  font-size: 16px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.opt-stats {
  font-family: var(--font-mono);
  font-size: 8.5px;
  letter-spacing: 0.08em;
  color: var(--ink-faint);
}

.hint {
  margin: 0 0 6px;
  font-family: var(--font-mono);
  font-size: 10.5px;
  letter-spacing: 0.06em;
  color: var(--ink-faint);
}

.controls {
  grid-column: 1 / -1;
  display: flex;
  align-items: flex-end;
  gap: 12px;
  flex-wrap: wrap;
}

.seed {
  display: grid;
  gap: 5px;
}

.seed input {
  width: 140px;
  padding: 9px 10px;
  font-family: var(--font-mono);
  font-size: 14px;
  color: var(--ink);
  background: var(--bg-void);
  border: 1px solid var(--line-strong);
}

.seed input:focus {
  border-color: var(--amber);
  outline: none;
}

/* ---- buttons ---- */

.ghost,
.go {
  font-family: var(--font-display);
  font-size: 15px;
  font-weight: 600;
  letter-spacing: 0.14em;
  padding: 10px 20px;
  cursor: pointer;
  clip-path: polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px);
}

.ghost {
  color: var(--ink-dim);
  background: transparent;
  border: 1px solid var(--line-strong);
}

.ghost:hover {
  color: var(--ink);
  border-color: var(--ink-faint);
}

.go {
  font-weight: 700;
  color: #14181c;
  background: var(--amber);
  border: 1px solid var(--amber);
}

.go:hover {
  background: #ffc34d;
}

/* ---- verdict ---- */

.verdict {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.2fr);
  gap: 24px;
  align-items: center;
  margin-top: 30px;
  padding: 20px 22px;
  background: linear-gradient(90deg, color-mix(in srgb, var(--side) 12%, var(--plate)), var(--plate) 60%);
  border: 1px solid var(--line);
  border-left: 4px solid var(--side);
  animation: lock-in 0.4s ease-out backwards;
}

.verdict.draw {
  --side: var(--ink-dim);
}

.verdict .crumb {
  color: var(--ink-faint);
}

.v-head {
  margin: 0 0 6px;
  font-family: var(--font-display);
  font-size: clamp(34px, 4.5vw, 48px);
  font-weight: 800;
  line-height: 0.95;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--side);
}

.v-detail {
  margin: 0;
  font-size: 13.5px;
  color: var(--ink-dim);
}

.v-mechs {
  display: grid;
  gap: 12px;
}

.v-mech {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 5px 12px;
  align-items: center;
}

.v-name {
  grid-column: 1 / -1;
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.08em;
  color: var(--ink-dim);
  text-transform: uppercase;
}

.v-name b {
  color: var(--side);
}

.v-num {
  font-family: var(--font-mono);
  font-size: 10.5px;
  color: var(--ink-faint);
}

/* ---- bars ---- */

.bar {
  position: relative;
  display: block;
  height: 6px;
  background: var(--bg-void);
  border: 1px solid var(--line);
  overflow: hidden;
}

.bar i {
  position: absolute;
  inset: 0 auto 0 0;
  background: var(--side);
}

.bar.en i {
  background: color-mix(in srgb, var(--side) 45%, var(--ink-faint));
}

/* ---- log ---- */

.log {
  display: grid;
  gap: 14px;
  margin: 26px 0 28px;
}

.log-intro {
  margin: 0;
  font-family: var(--font-mono);
  font-size: 10.5px;
  letter-spacing: 0.14em;
  color: var(--ink-faint);
}

.round {
  background: var(--plate);
  border: 1px solid var(--line);
  animation: lock-in 0.35s ease-out backwards;
}

@keyframes lock-in {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
}

.r-head {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 10px 14px;
  border-bottom: 1px solid var(--line);
  background: var(--plate-raised);
}

.r-num {
  font-family: var(--font-display);
  font-size: 22px;
  font-weight: 800;
  letter-spacing: 0.08em;
  color: var(--ink);
}

.chip {
  padding: 2px 8px;
  font-family: var(--font-mono);
  font-size: 9.5px;
  letter-spacing: 0.14em;
  color: var(--side);
  border: 1px solid color-mix(in srgb, var(--side) 55%, transparent);
}

.r-dist {
  margin-left: auto;
  font-family: var(--font-mono);
  font-size: 10.5px;
  letter-spacing: 0.1em;
  color: var(--ink-dim);
}

.actions {
  display: grid;
  gap: 1px;
  margin: 0;
  padding: 0;
  list-style: none;
  background: var(--line);
}

.act {
  display: grid;
  grid-template-columns: 44px minmax(0, 1fr) auto;
  gap: 12px;
  align-items: start;
  padding: 9px 14px;
  background: var(--plate);
  border-left: 3px solid var(--side);
}

.act.side-B {
  background: color-mix(in srgb, var(--side-B) 4%, var(--plate));
}

.a-side {
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.1em;
  color: var(--side);
}

.a-body {
  display: grid;
  gap: 4px;
  min-width: 0;
}

.a-line {
  display: flex;
  align-items: baseline;
  gap: 10px;
  flex-wrap: wrap;
}

.a-name {
  font-family: var(--font-display);
  font-size: 16px;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: var(--ink);
}

.a-weapon {
  font-family: var(--font-mono);
  font-size: 10.5px;
  letter-spacing: 0.06em;
  color: var(--ink-dim);
}

.a-fail {
  font-family: var(--font-mono);
  font-size: 9.5px;
  letter-spacing: 0.14em;
  color: var(--danger);
}

.act.failed .a-name {
  color: var(--ink-faint);
  text-decoration: line-through;
  text-decoration-color: var(--danger);
}

.a-details {
  display: flex;
  gap: 6px 14px;
  flex-wrap: wrap;
  font-family: var(--font-mono);
  font-size: 11px;
  line-height: 1.4;
}

.d {
  color: var(--ink-dim);
}

.d.hit {
  color: #ff8a70;
}

.d.miss {
  color: var(--ink-faint);
  font-style: italic;
}

.d.buff {
  color: #8fc98a;
}

.d.scan {
  color: #c9a7ec;
}

.a-cost {
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.08em;
  color: var(--ink-faint);
  white-space: nowrap;
}

.destroyed {
  margin: 0;
  padding: 8px 14px;
  font-family: var(--font-display);
  font-size: 16px;
  font-weight: 700;
  letter-spacing: 0.16em;
  color: var(--danger);
  background: color-mix(in srgb, var(--danger) 10%, var(--plate));
  border-top: 1px solid color-mix(in srgb, var(--danger) 40%, transparent);
}

.r-status {
  display: grid;
  gap: 10px;
  padding: 12px 14px;
  border-top: 1px solid var(--line);
}

.track {
  position: relative;
  height: 18px;
  margin: 0 10px;
  background:
    linear-gradient(var(--line), var(--line)) center / 100% 1px no-repeat,
    repeating-linear-gradient(90deg, var(--line) 0 1px, transparent 1px 8.333%);
}

.pin {
  position: absolute;
  top: 0;
  width: 18px;
  height: 18px;
  margin-left: -9px;
  font-family: var(--font-mono);
  font-size: 10px;
  font-style: normal;
  font-weight: 600;
  line-height: 18px;
  text-align: center;
  color: #14181c;
  background: var(--side);
  transition: left 0.3s ease-out;
}

.gauges {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 18px;
}

.gauge {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 64px;
  gap: 4px 10px;
  align-items: center;
}

.g-label {
  grid-column: 1 / -1;
  font-family: var(--font-mono);
  font-size: 9.5px;
  letter-spacing: 0.12em;
  color: var(--side);
}

.g-num {
  font-family: var(--font-mono);
  font-size: 10px;
  text-align: right;
  color: var(--ink-dim);
}

.note {
  margin: 26px 0 0;
  padding: 12px 0;
  border-top: 1px solid var(--line);
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.14em;
  text-align: center;
  color: var(--amber);
}

/* ---- dock ---- */

.dock {
  position: sticky;
  bottom: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
  margin: auto -1px 0;
  padding: 12px 16px;
  background: color-mix(in srgb, var(--plate) 92%, transparent);
  backdrop-filter: blur(6px);
  border: 1px solid var(--line);
  border-bottom: none;
}

.readout {
  display: flex;
  align-items: center;
  gap: 10px;
  font-family: var(--font-mono);
  font-size: 11.5px;
  letter-spacing: 0.1em;
  color: var(--ink-dim);
  text-transform: uppercase;
}

.dock-dot {
  width: 8px;
  height: 8px;
  border: 1px solid var(--amber);
}

.dock-dot.on {
  background: var(--amber);
  box-shadow: 0 0 8px var(--amber);
}

.actions-bar {
  display: flex;
  gap: 10px;
}

@media (max-width: 760px) {
  .options.brains {
    grid-template-columns: repeat(3, 1fr);
  }

  .verdict,
  .gauges {
    grid-template-columns: 1fr;
  }
}
</style>
