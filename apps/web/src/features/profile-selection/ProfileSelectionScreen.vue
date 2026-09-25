<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, shallowRef, useTemplateRef } from "vue";
import { STARTER_BRAINS } from "../brain-selection/brains";
import type { BrainId } from "../brain-selection/brains";
import type { HangarScene } from "./hangarShared";
import { ARMOR_PIPS, COMBAT_PROFILES, MOBILITY_PIPS } from "./profiles";
import type { ProfileId } from "./profiles";

// Combat Profile Selection as a 3D hangar bay (SPEC §60). The chassis on the
// turntable is always the current pick; holding DEPLOY commits it. The WebGL
// scene is presentation only and loads lazily — without WebGL the HUD still
// works on its own.

const props = defineProps<{ brainId?: BrainId | null }>();
const emit = defineEmits<{ confirm: [id: ProfileId]; back: [] }>();

const HP_SCALE = 240;
const MOVE_SCALE = 30;
const HOLD_RATE = 1.3; // full hold in ~0.8 s
const RELEASE_RATE = 3;
const CONFIRM_DELAY_MS = 1500;

const index = shallowRef(0);
const hold = shallowRef(0);
const deployed = shallowRef(false);
const flash = shallowRef(false);
const sceneState = shallowRef<"loading" | "ready" | "offline">("loading");
const clock = shallowRef(new Date().toLocaleTimeString("en-GB"));

const profile = computed(() => COMBAT_PROFILES[index.value]!);
const brain = computed(() => STARTER_BRAINS.find((b) => b.id === props.brainId) ?? null);

const canvasEl = useTemplateRef<HTMLCanvasElement>("canvas");
const calloutsEl = useTemplateRef<SVGSVGElement>("callouts");
const tagMelee = useTemplateRef<HTMLElement>("tagMelee");
const tagRanged = useTemplateRef<HTMLElement>("tagRanged");
const tagSensor = useTemplateRef<HTMLElement>("tagSensor");

let scene: HangarScene | null = null;
let unmounted = false;
let holding = false;
let holdFrame = 0;
let lastHoldTs: number | null = null;
const timers: number[] = [];

function select(i: number): void {
  if (deployed.value) return;
  index.value = (i + COMBAT_PROFILES.length) % COMBAT_PROFILES.length;
  scene?.showProfile(profile.value);
}

function startHold(): void {
  if (deployed.value) return;
  holding = true;
  runHold();
}

function endHold(): void {
  holding = false;
}

// Hold-to-deploy meter: fills while held, drains on release.
function runHold(): void {
  if (holdFrame) return;
  lastHoldTs = null;
  const step = (ts: number) => {
    const dt = lastHoldTs === null ? 0 : Math.min((ts - lastHoldTs) / 1000, 0.05);
    lastHoldTs = ts;
    hold.value = holding
      ? Math.min(1, hold.value + dt * HOLD_RATE)
      : Math.max(0, hold.value - dt * RELEASE_RATE);
    if (hold.value >= 1) {
      holdFrame = 0;
      deploy();
      return;
    }
    holdFrame = holding || hold.value > 0 ? requestAnimationFrame(step) : 0;
  };
  holdFrame = requestAnimationFrame(step);
}

function deploy(): void {
  holding = false;
  deployed.value = true;
  flash.value = true;
  timers.push(window.setTimeout(() => (flash.value = false), 90));
  scene?.punchIn();
  const id = profile.value.id;
  timers.push(window.setTimeout(() => emit("confirm", id), CONFIRM_DELAY_MS));
}

function onKeydown(e: KeyboardEvent): void {
  if (e.repeat) return;
  const k = e.key.toLowerCase();
  if (k === "a" || k === "arrowleft") select(index.value - 1);
  else if (k === "d" || k === "arrowright") select(index.value + 1);
  else if (k === "enter") {
    e.preventDefault();
    startHold();
  } else if (k === "escape" && !deployed.value) emit("back");
}

function onKeyup(e: KeyboardEvent): void {
  if (e.key === "Enter") endHold();
}

function webglAvailable(): boolean {
  try {
    return document.createElement("canvas").getContext("webgl2") !== null;
  } catch {
    return false;
  }
}

async function initScene(): Promise<void> {
  if (!webglAvailable()) {
    sceneState.value = "offline";
    return;
  }
  const [{ createHangarScene }] = await Promise.all([
    import("./hangarScene"),
    document.fonts.ready,
  ]);
  if (unmounted || !canvasEl.value || !calloutsEl.value) return;
  scene = createHangarScene(canvasEl.value, {
    svg: calloutsEl.value,
    tags: { melee: tagMelee.value!, ranged: tagRanged.value!, sensor: tagSensor.value! },
  });
  scene.showProfile(profile.value);
  sceneState.value = "ready";
}

onMounted(() => {
  window.addEventListener("keydown", onKeydown);
  window.addEventListener("keyup", onKeyup);
  window.addEventListener("pointerup", endHold);
  timers.push(
    window.setInterval(() => (clock.value = new Date().toLocaleTimeString("en-GB")), 1000),
  );
  initScene().catch(() => {
    sceneState.value = "offline";
  });
});

onBeforeUnmount(() => {
  unmounted = true;
  window.removeEventListener("keydown", onKeydown);
  window.removeEventListener("keyup", onKeyup);
  window.removeEventListener("pointerup", endHold);
  for (const id of timers) window.clearTimeout(id);
  cancelAnimationFrame(holdFrame);
  scene?.dispose();
  scene = null;
});
</script>

<template>
  <main class="hangar" :style="{ '--accent': profile.accent }">
    <canvas ref="canvas" class="scene" aria-hidden="true" />
    <svg ref="callouts" class="callouts" aria-hidden="true" />
    <div ref="tagMelee" class="tag" aria-hidden="true">
      <span>MELEE</span><b>{{ profile.melee.name }}</b><em>{{ profile.melee.damage }} DMG</em>
      <span>· {{ profile.melee.energy }} EN</span>
    </div>
    <div ref="tagRanged" class="tag" aria-hidden="true">
      <span>RANGED</span><b>{{ profile.ranged.name }}</b><em>{{ profile.ranged.damage }} DMG</em>
      <span>· {{ profile.ranged.energy }} EN</span>
    </div>
    <div ref="tagSensor" class="tag" aria-hidden="true">
      <span>SENSOR HEAD</span><b>{{ profile.designation }}</b><em>{{ profile.massTons }} T</em>
      <span>· {{ profile.hp }} HP</span>
    </div>
    <div class="fx vignette" />
    <div class="fx scan" />
    <div class="fx frame" />

    <div class="hud">
      <header class="top">
        <div class="brand">
          <span class="logo" aria-hidden="true" />
          <div><b>Steelmind</b><small>HANGAR 04 · CHASSIS BAY</small></div>
        </div>
        <ol class="steps" aria-label="Loadout steps">
          <li class="done">BRAIN<span v-if="brain">{{ brain.name.toUpperCase() }}</span></li>
          <li class="now" aria-current="step">CHASSIS</li>
          <li>DEPLOY</li>
        </ol>
        <div class="sys">DEV SANDBOX · <b>ONLINE</b><br>{{ clock }}</div>
      </header>

      <section :key="profile.id" class="ident">
        <div class="desig">{{ profile.designation }} // COMBAT PROFILE</div>
        <h1 class="name">{{ profile.name }}</h1>
        <div class="role">{{ profile.role }}</div>
        <p class="doctrine">“{{ profile.doctrine }}”</p>
      </section>

      <aside class="stats i" aria-label="Chassis data">
        <h2>CHASSIS DATA <span>{{ profile.massTons }} T</span></h2>
        <div class="row">
          <div class="lbl">HULL POINTS <b>{{ profile.hp }}</b></div>
          <div class="bar"><i :style="{ '--c': '#62b85a', width: `${(profile.hp / HP_SCALE) * 100}%` }" /></div>
        </div>
        <div class="row">
          <div class="lbl">
            ARMOR
            <b>{{ profile.armor }}<template v-if="profile.armorReductionPct"> · −{{ profile.armorReductionPct }}% DMG</template></b>
          </div>
          <div class="pips">
            <i v-for="n in 3" :key="n" :class="{ on: n <= ARMOR_PIPS[profile.armor] }" />
          </div>
        </div>
        <div class="row">
          <div class="lbl">MOBILITY <b>{{ profile.mobility }}</b></div>
          <div class="pips">
            <i v-for="n in 3" :key="n" :class="{ on: n <= MOBILITY_PIPS[profile.mobility] }" />
          </div>
        </div>
        <div class="row">
          <div class="lbl">ADVANCE / CHARGE <b>{{ profile.advanceMeters }} m / {{ profile.chargeMeters }} m</b></div>
          <div class="bar"><i :style="{ '--c': '#45c4cf', width: `${(profile.chargeMeters / MOVE_SCALE) * 100}%` }" /></div>
        </div>
        <div class="weapons">
          <div class="wpn">
            <svg viewBox="0 0 34 34" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <path d="M8 26 L22 12 M18 8 L26 16 L22 20 L14 12 Z" />
            </svg>
            <div>
              <b>{{ profile.melee.name }}</b>
              <small>MELEE · {{ profile.melee.rangeLabel }} · {{ profile.melee.energy }} EN</small>
            </div>
            <div class="dmg">{{ profile.melee.damage }}<small>DMG</small></div>
          </div>
          <div class="wpn">
            <svg viewBox="0 0 34 34" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <path d="M4 20 H22 V14 H30 M8 20 V26 H14 V20 M22 17 H4" />
            </svg>
            <div>
              <b>{{ profile.ranged.name }}</b>
              <small>RANGED · {{ profile.ranged.rangeLabel }} · {{ profile.ranged.energy }} EN</small>
            </div>
            <div class="dmg">{{ profile.ranged.damage }}<small>DMG</small></div>
          </div>
        </div>
      </aside>

      <div v-if="sceneState === 'ready'" class="hint">DRAG TO ROTATE · SCROLL TO ZOOM</div>

      <nav class="picker i" aria-label="Combat profiles">
        <button type="button" class="nav" aria-label="Previous chassis" @click="select(index - 1)">
          <kbd>A</kbd>◀
        </button>
        <div class="tiles">
          <button
            v-for="(p, i) in COMBAT_PROFILES"
            :key="p.id"
            type="button"
            class="tile"
            :class="{ on: i === index }"
            :style="{ '--c': p.accent }"
            :aria-pressed="i === index"
            @click="select(i)"
          >
            <small>{{ p.designation }}</small>
            <b>{{ p.name }}</b>
          </button>
        </div>
        <button type="button" class="nav" aria-label="Next chassis" @click="select(index + 1)">
          ▶<kbd>D</kbd>
        </button>
      </nav>

      <button
        type="button"
        class="deploy i"
        :style="{ '--p': hold }"
        :disabled="deployed"
        @pointerdown="startHold"
      >
        <span class="fill" />
        <span class="lbl">DEPLOY</span>
        <small>HOLD <kbd>ENTER</kbd> OR CLICK · <kbd>ESC</kbd> BACK</small>
      </button>
    </div>

    <div class="locked" :class="{ on: deployed }" aria-live="polite">
      <div v-if="deployed">CHASSIS LOCKED</div>
    </div>
    <div class="fx flash" :class="{ on: flash }" />
    <div v-if="sceneState !== 'ready'" class="loading" :class="{ offline: sceneState === 'offline' }">
      {{ sceneState === "loading" ? "INITIALISING HANGAR…" : "3D BAY OFFLINE — WEBGL UNAVAILABLE" }}
    </div>
  </main>
</template>

<style scoped>
.hangar {
  --dim: var(--ink-dim);
  --faint: var(--ink-faint);
  --glass: rgba(14, 18, 22, 0.68);
  --edge: rgba(255, 176, 32, 0.28);
  position: fixed;
  inset: 0;
  overflow: hidden;
  background: #07090b;
  user-select: none;
}

kbd {
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 600;
  padding: 1px 6px;
  border: 1px solid currentColor;
  border-bottom-width: 3px;
  border-radius: 3px;
  opacity: 0.85;
}

.scene {
  position: absolute;
  inset: 0;
  display: block;
  cursor: grab;
}

.scene:active {
  cursor: grabbing;
}

/* ---- screen fx ---- */

.fx {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.fx.vignette {
  background: radial-gradient(ellipse 75% 70% at 50% 45%, transparent 55%, rgba(0, 0, 0, 0.75) 100%);
}

.fx.scan {
  background: repeating-linear-gradient(0deg, rgba(255, 255, 255, 0.018) 0 1px, transparent 1px 3px);
  mix-blend-mode: overlay;
}

.fx.frame::before,
.fx.frame::after {
  content: "";
  position: absolute;
  width: 46px;
  height: 46px;
  border: 2px solid var(--edge);
}

.fx.frame::before {
  top: 14px;
  left: 14px;
  border-right: 0;
  border-bottom: 0;
}

.fx.frame::after {
  bottom: 14px;
  right: 14px;
  border-left: 0;
  border-top: 0;
}

.fx.flash {
  background: #fff3d6;
  opacity: 0;
  transition: opacity 0.5s;
}

.fx.flash.on {
  opacity: 0.9;
  transition: opacity 0.05s;
}

/* ---- 3D callouts ---- */

.callouts {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.callouts :deep(polyline) {
  fill: none;
  stroke: var(--amber);
  stroke-width: 1;
  opacity: 0;
}

.callouts :deep(circle) {
  fill: var(--amber);
  opacity: 0;
}

.tag {
  position: absolute;
  left: 0;
  top: 0;
  opacity: 0;
  pointer-events: none;
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.06em;
  padding: 6px 10px 6px 12px;
  background: var(--glass);
  border-left: 2px solid var(--amber);
  backdrop-filter: blur(6px);
  white-space: nowrap;
  transition: opacity 0.25s;
}

.tag b {
  display: block;
  font-family: var(--font-display);
  font-size: 16px;
  letter-spacing: 0.05em;
  font-weight: 700;
  color: var(--ink);
}

.tag span {
  color: var(--dim);
}

.tag em {
  font-style: normal;
  color: var(--amber);
}

/* ---- HUD ---- */

.hud {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.hud .i {
  pointer-events: auto;
}

.top {
  position: absolute;
  top: 28px;
  left: 36px;
  right: 36px;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
}

.brand {
  display: flex;
  gap: 12px;
  align-items: center;
}

.logo {
  width: 30px;
  height: 30px;
  background: var(--amber);
  clip-path: polygon(50% 0, 100% 28%, 100% 72%, 50% 100%, 0 72%, 0 28%);
  position: relative;
}

.logo::after {
  content: "";
  position: absolute;
  inset: 7px;
  background: #07090b;
  clip-path: inherit;
}

.brand b {
  display: block;
  font-family: var(--font-display);
  font-weight: 800;
  font-size: 22px;
  letter-spacing: 0.22em;
  line-height: 1;
  text-transform: uppercase;
}

.brand small {
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--dim);
  letter-spacing: 0.16em;
}

.steps {
  list-style: none;
  display: flex;
  gap: 4px;
  margin: 0;
  padding: 0;
  font-family: var(--font-display);
  font-weight: 700;
  letter-spacing: 0.14em;
  font-size: 13px;
}

.steps li {
  padding: 7px 22px 7px 18px;
  background: rgba(20, 24, 28, 0.7);
  color: var(--faint);
  clip-path: polygon(0 0, calc(100% - 10px) 0, 100% 50%, calc(100% - 10px) 100%, 0 100%, 10px 50%);
}

.steps li span {
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 500;
  margin-left: 8px;
  color: var(--dim);
  letter-spacing: 0.08em;
}

.steps li.done {
  color: var(--ink);
}

.steps li.done::before {
  content: "✓ ";
  color: #62b85a;
}

.steps li.now {
  background: var(--amber);
  color: #111;
}

.sys {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--dim);
  letter-spacing: 0.12em;
  text-align: right;
  line-height: 1.6;
}

.sys b {
  color: var(--amber);
  font-weight: 500;
}

/* ---- identity block ---- */

.ident {
  position: absolute;
  left: 56px;
  bottom: 150px;
  max-width: 460px;
  animation: swap-in 0.6s cubic-bezier(0.2, 0.8, 0.2, 1) both;
}

@keyframes swap-in {
  0% {
    opacity: 0;
    transform: translateX(-24px);
    filter: blur(6px);
    clip-path: inset(-20% 100% -20% -20%);
  }
  100% {
    opacity: 1;
    transform: none;
    filter: none;
    clip-path: inset(-20% -60% -20% -20%);
  }
}

.desig {
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--accent);
  letter-spacing: 0.3em;
  display: flex;
  align-items: center;
  gap: 10px;
}

.desig::before {
  content: "";
  width: 28px;
  height: 2px;
  background: var(--accent);
}

.name {
  font-family: var(--font-display);
  font-weight: 800;
  font-size: clamp(64px, 9vw, 128px);
  line-height: 0.82;
  letter-spacing: 0.01em;
  text-transform: uppercase;
  margin: 10px 0 8px;
  text-shadow: 0 0 40px color-mix(in srgb, var(--accent) 45%, transparent);
}

.role {
  font-family: var(--font-display);
  font-weight: 600;
  font-size: 22px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--dim);
}

.doctrine {
  margin: 14px 0 0;
  font-size: 15px;
  line-height: 1.5;
  opacity: 0.85;
  border-left: 2px solid var(--accent);
  padding-left: 12px;
  font-style: italic;
}

/* ---- stat panel ---- */

.stats {
  position: absolute;
  right: 36px;
  top: 50%;
  transform: translateY(-50%) perspective(900px) rotateY(-9deg);
  transform-origin: right center;
  width: 340px;
  padding: 22px 22px 20px;
  background: var(--glass);
  backdrop-filter: blur(10px);
  clip-path: polygon(18px 0, 100% 0, 100% calc(100% - 18px), calc(100% - 18px) 100%, 0 100%, 0 18px);
  border-top: 1px solid var(--edge);
}

.stats h2 {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 13px;
  letter-spacing: 0.3em;
  color: var(--amber);
  margin: 0 0 16px;
  display: flex;
  justify-content: space-between;
}

.stats h2 span {
  color: var(--faint);
  font-family: var(--font-mono);
  font-weight: 400;
  letter-spacing: 0.1em;
  font-size: 10px;
}

.row {
  margin-bottom: 14px;
}

.row .lbl {
  display: flex;
  justify-content: space-between;
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.12em;
  color: var(--dim);
  margin-bottom: 6px;
}

.row .lbl b {
  color: var(--ink);
  font-weight: 600;
}

.bar {
  height: 8px;
  background: rgba(255, 255, 255, 0.06);
  position: relative;
  overflow: hidden;
}

.bar i {
  position: absolute;
  inset: 0 auto 0 0;
  background: repeating-linear-gradient(90deg, var(--c, var(--amber)) 0 9px, transparent 9px 11px);
  transition: width 0.7s cubic-bezier(0.2, 0.8, 0.2, 1);
  box-shadow: 0 0 12px var(--c, var(--amber));
}

.pips {
  display: flex;
  gap: 4px;
}

.pips i {
  flex: 1;
  height: 8px;
  background: rgba(255, 255, 255, 0.07);
  transform: skewX(-20deg);
  transition: background 0.3s;
}

.pips i.on {
  background: var(--amber);
  box-shadow: 0 0 10px rgba(255, 176, 32, 0.5);
}

.weapons {
  display: grid;
  gap: 8px;
  margin-top: 18px;
}

.wpn {
  display: grid;
  grid-template-columns: 34px 1fr auto;
  gap: 12px;
  align-items: center;
  padding: 10px 12px;
  background: rgba(255, 255, 255, 0.035);
  border-left: 2px solid var(--accent);
}

.wpn svg {
  width: 34px;
  height: 34px;
}

.wpn b {
  font-family: var(--font-display);
  font-size: 18px;
  font-weight: 700;
  letter-spacing: 0.04em;
  display: block;
  line-height: 1.1;
}

.wpn small {
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--dim);
  letter-spacing: 0.1em;
}

.wpn .dmg {
  font-family: var(--font-display);
  font-weight: 800;
  font-size: 28px;
  color: var(--amber);
  text-align: right;
  line-height: 1;
}

.wpn .dmg small {
  display: block;
  font-size: 9px;
}

/* ---- chassis picker ---- */

.picker {
  position: absolute;
  left: 50%;
  bottom: 40px;
  transform: translateX(-50%);
  display: flex;
  align-items: stretch;
  gap: 8px;
}

.tiles {
  display: flex;
  gap: 8px;
}

.nav {
  background: none;
  border: 0;
  color: var(--dim);
  font-family: var(--font-display);
  font-size: 22px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 10px;
  cursor: pointer;
}

.nav:hover {
  color: var(--amber);
}

.tile {
  width: 150px;
  padding: 12px 16px 10px;
  background: rgba(14, 18, 22, 0.72);
  border: 0;
  color: var(--dim);
  text-align: left;
  cursor: pointer;
  transform: skewX(-12deg);
  position: relative;
  transition: transform 0.25s, background 0.25s, color 0.25s;
}

.tile > * {
  display: block;
  transform: skewX(12deg);
}

.tile small {
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.2em;
}

.tile b {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 22px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.tile::after {
  content: "";
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 3px;
  background: var(--c);
  opacity: 0.35;
  transition: opacity 0.25s;
}

.tile:hover {
  color: var(--ink);
}

.tile.on {
  background: rgba(255, 176, 32, 0.14);
  color: var(--ink);
  transform: skewX(-12deg) translateY(-8px);
}

.tile.on::after {
  opacity: 1;
  box-shadow: 0 0 18px var(--c);
}

/* ---- deploy ---- */

.deploy {
  position: absolute;
  right: 36px;
  bottom: 36px;
  width: 280px;
  height: 78px;
  border: 0;
  background: rgba(255, 176, 32, 0.12);
  color: var(--amber);
  cursor: pointer;
  clip-path: polygon(22px 0, 100% 0, 100% 100%, 0 100%, 0 22px);
  overflow: hidden;
  font-family: var(--font-display);
  text-align: left;
  padding: 0 26px;
}

.deploy::before {
  content: "";
  position: absolute;
  inset: 0;
  border: 1px solid var(--amber);
  clip-path: inherit;
}

.deploy .fill {
  position: absolute;
  inset: 0;
  background: var(--amber);
  transform-origin: left;
  transform: scaleX(var(--p, 0));
}

.deploy .lbl {
  position: relative;
  font-size: 34px;
  font-weight: 800;
  letter-spacing: 0.2em;
  display: block;
  line-height: 1;
  mix-blend-mode: difference;
  color: var(--amber);
}

.deploy small {
  position: relative;
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.14em;
  color: var(--dim);
}

.deploy:hover:not(:disabled) {
  background: rgba(255, 176, 32, 0.2);
}

.deploy:disabled {
  cursor: default;
}

.hint {
  position: absolute;
  left: 50%;
  bottom: 128px;
  transform: translateX(-50%);
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.24em;
  color: var(--faint);
}

/* ---- overlays ---- */

.locked {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.4s;
}

.locked.on {
  opacity: 1;
}

.locked div {
  font-family: var(--font-display);
  font-weight: 800;
  font-size: clamp(40px, 7vw, 92px);
  letter-spacing: 0.3em;
  color: var(--amber);
  text-shadow: 0 0 40px rgba(255, 176, 32, 0.6);
  padding: 12px 40px;
  background: rgba(7, 9, 11, 0.6);
  border-top: 2px solid;
  border-bottom: 2px solid;
}

.loading {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  font-family: var(--font-mono);
  color: var(--amber);
  letter-spacing: 0.3em;
  font-size: 12px;
  background: #07090b;
}

.loading.offline {
  inset: auto 0 50% 0;
  background: none;
  color: var(--faint);
  pointer-events: none;
}

@media (max-width: 900px) {
  .stats {
    top: auto;
    bottom: 170px;
    transform: none;
    right: 16px;
    width: 280px;
    padding: 14px;
  }

  .ident {
    left: 16px;
    top: 110px;
    bottom: auto;
  }

  .steps,
  .sys,
  .tag,
  .callouts,
  .hint {
    display: none;
  }

  .top {
    left: 16px;
    right: 16px;
  }

  .deploy {
    right: 16px;
    bottom: 16px;
    width: 180px;
    height: 60px;
  }

  .deploy .lbl {
    font-size: 24px;
  }

  .deploy small {
    display: none;
  }

  .picker {
    bottom: 90px;
  }

  .tile {
    width: 96px;
    padding: 8px 10px;
  }

  .tile b {
    font-size: 16px;
  }
}
</style>
