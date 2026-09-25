<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, shallowRef, watch } from "vue";
import { BEHAVIOUR_MATRIX, MATRIX_AXES } from "./behaviourMatrix";
import type { BehaviourMatrix } from "./behaviourMatrix";
import DirectiveText from "./DirectiveText.vue";
import { STARTER_BRAINS, formatCondition } from "./brains";
import type { BrainId } from "./brains";

// Brain Selection as a neural loader (SPEC §60, §52): a 3D carousel of the
// Starter Brains, a behaviour radar and the priority stack (SPEC §48) of the
// brain in focus. Linking the focused brain commits it; App.vue owns the flow
// order. Starter Brains are factory firmware — copied when customized.

const emit = defineEmits<{ confirm: [id: BrainId] }>();

const N = STARTER_BRAINS.length;
const STEP_DEG = 24;
const RADIUS = 820;
const TYPE_CHARS_PER_TICK = 3;
const CONFIRM_DELAY_MS = 900;

// Priority order, highest first (SPEC §48).
const LAYERS = ["EMERGENCY", "TRIGGER 1", "TRIGGER 2", "TRIGGER 3", "OPENING", "CORE"] as const;
const CORE_LAYER = LAYERS.length - 1;

const pos = shallowRef(0);
const layer = shallowRef<number>(CORE_LAYER);
const linking = shallowRef(false);
const linkProgress = shallowRef(0);
const tilt = shallowRef({ x: 0, y: 0 });
const typed = shallowRef(0);
const radarValues = shallowRef<number[]>([0, 0, 0, 0, 0]);

const idxOf = (p: number) => ((p % N) + N) % N;
const current = computed(() => idxOf(pos.value));
const brain = computed(() => STARTER_BRAINS[current.value]!);

// Relative carousel slot per card; cards wrapping around the back skip their
// transition so they don't sweep through the ring.
const prevRel: number[] = STARTER_BRAINS.map(() => 0);
const cards = computed(() =>
  STARTER_BRAINS.map((b, j) => {
    let rel = j - current.value;
    if (rel > N / 2) rel -= N;
    if (rel < -N / 2) rel += N;
    const jump = Math.abs(rel - prevRel[j]!) > 2;
    prevRel[j] = rel;
    const base = `rotateY(${rel * STEP_DEG}deg) translateZ(${RADIUS}px)`;
    const on = j === current.value;
    return {
      brain: b,
      on,
      style: {
        "--c": b.accent,
        transform: on && linking.value ? `${base} translateZ(160px)` : base,
        opacity: Math.abs(rel) > 1 ? 0.35 : 1,
        transition: jump ? "none" : undefined,
      },
    };
  }),
);

const detail = computed(() => {
  const b = brain.value;
  const l = layer.value;
  if (l === 0) {
    return {
      cond: `WHEN OWN HP < ${b.emergency.hpThresholdPercent}% · OVERRIDES ALL`,
      text: b.emergency.directive,
    };
  }
  if (l <= 3) {
    const slot = b.triggerSlots[l - 1]!;
    return { cond: `WHEN ${formatCondition(slot.condition)}`, text: slot.directive };
  }
  if (l === 4) return { cond: "OPENING READ · FIRST ROUNDS", text: b.openingDirective };
  return { cond: "CORE DIRECTIVE · ALWAYS ON", text: b.coreDirective };
});

// ---- radar ----

const radarPoint = (i: number, v: number): [number, number] => {
  const a = -Math.PI / 2 + (i / MATRIX_AXES.length) * Math.PI * 2;
  return [Math.cos(a) * v, Math.sin(a) * v];
};
const toPoints = (values: readonly number[]) =>
  values.map((v, i) => radarPoint(i, v * 0.95).join(",")).join(" ");
const radarGrid = [25, 50, 75, 100].map((s) => toPoints(MATRIX_AXES.map(() => s)));
const radarAxes = MATRIX_AXES.map((label, i) => {
  const [x, y] = radarPoint(i, 95);
  const [lx, ly] = radarPoint(i, 112);
  return { label, x, y, lx, ly: ly + 3 };
});
const radarShape = computed(() => toPoints(radarValues.value));

let radarFrame = 0;
function tweenRadar(to: BehaviourMatrix): void {
  cancelAnimationFrame(radarFrame);
  const from = radarValues.value;
  let t = 0;
  const step = () => {
    t = Math.min(1, t + 0.05);
    const e = 1 - Math.pow(1 - t, 3);
    radarValues.value = from.map((f, i) => f + (to[i]! - f) * e);
    radarFrame = t < 1 ? requestAnimationFrame(step) : 0;
  };
  radarFrame = requestAnimationFrame(step);
}

// ---- typewriter ----

let typeTimer = 0;
function typeOut(): void {
  window.clearInterval(typeTimer);
  typed.value = 0;
  typeTimer = window.setInterval(() => {
    typed.value += TYPE_CHARS_PER_TICK;
    if (typed.value >= detail.value.text.length) window.clearInterval(typeTimer);
  }, 16);
}

watch(detail, typeOut);
watch(brain, (b) => tweenRadar(BEHAVIOUR_MATRIX[b.id]));

// ---- navigation ----

function step(d: number): void {
  if (linking.value) return;
  pos.value += d;
}

function goTo(j: number): void {
  let d = j - current.value;
  if (d > N / 2) d -= N;
  if (d < -N / 2) d += N;
  step(d);
}

function setLayer(i: number): void {
  layer.value = (i + LAYERS.length) % LAYERS.length;
}

function onCardClick(j: number): void {
  if (j === current.value) link();
  else goTo(j);
}

// ---- link sequence ----

const timers: number[] = [];
let linkTimer = 0;
function link(): void {
  if (linking.value) return;
  linking.value = true;
  linkProgress.value = 0;
  const id = brain.value.id;
  linkTimer = window.setInterval(() => {
    linkProgress.value = Math.min(100, linkProgress.value + Math.random() * 9 + 2);
    if (linkProgress.value >= 100) {
      window.clearInterval(linkTimer);
      timers.push(window.setTimeout(() => emit("confirm", id), CONFIRM_DELAY_MS));
    }
  }, 60);
}

// ---- input ----

function onKeydown(e: KeyboardEvent): void {
  const k = e.key.toLowerCase();
  if (k === "a" || k === "arrowleft") step(-1);
  else if (k === "d" || k === "arrowright") step(1);
  else if (k === "w" || k === "arrowup") setLayer(layer.value - 1);
  else if (k === "s" || k === "arrowdown") setLayer(layer.value + 1);
  else if (k === "enter") {
    e.preventDefault();
    link();
  } else return;
  if (k.startsWith("arrow")) e.preventDefault();
}

let wheelLock = 0;
function onWheel(e: WheelEvent): void {
  const now = Date.now();
  if (now - wheelLock < 350) return;
  wheelLock = now;
  step(Math.sign(e.deltaY || e.deltaX));
}

function onPointerMove(e: PointerEvent): void {
  tilt.value = {
    x: -(e.clientY / window.innerHeight - 0.5) * 8,
    y: (e.clientX / window.innerWidth - 0.5) * 10,
  };
}

onMounted(() => {
  window.addEventListener("keydown", onKeydown);
  window.addEventListener("wheel", onWheel, { passive: true });
  window.addEventListener("pointermove", onPointerMove);
  tweenRadar(BEHAVIOUR_MATRIX[brain.value.id]);
  typeOut();
});

onBeforeUnmount(() => {
  window.removeEventListener("keydown", onKeydown);
  window.removeEventListener("wheel", onWheel);
  window.removeEventListener("pointermove", onPointerMove);
  cancelAnimationFrame(radarFrame);
  window.clearInterval(typeTimer);
  window.clearInterval(linkTimer);
  for (const id of timers) window.clearTimeout(id);
});
</script>

<template>
  <main class="neural" :style="{ '--accent': brain.accent }">
    <div class="sky" />
    <div class="floor" />
    <div class="backword" aria-hidden="true">{{ brain.name.toUpperCase() }}</div>

    <header class="top">
      <div class="brand"><i aria-hidden="true" />Steelmind</div>
      <div class="title">
        <small>STEP 1 / 3 · NEURAL LOADER</small>
        <h1>Select Brain</h1>
      </div>
      <div class="steps" aria-hidden="true">BRAIN <i class="on" /><i /><i /></div>
    </header>

    <aside class="panel left" aria-label="Behaviour matrix">
      <h3>BEHAVIOUR MATRIX <b>{{ brain.designation }}</b></h3>
      <svg class="radar" viewBox="-130 -118 260 236" aria-hidden="true">
        <polygon v-for="(points, i) in radarGrid" :key="i" class="grid" :points="points" />
        <template v-for="axis in radarAxes" :key="axis.label">
          <line class="grid" x1="0" y1="0" :x2="axis.x" :y2="axis.y" />
          <text :x="axis.lx" :y="axis.ly" text-anchor="middle">{{ axis.label }}</text>
        </template>
        <polygon class="shape" :points="radarShape" />
      </svg>
      <div class="quote">“{{ brain.role }}”</div>
      <div class="flag">MATRIX = FLAVOUR PREVIEW, NOT ENGINE DATA</div>
    </aside>

    <div class="stage">
      <div class="tilt" :style="{ transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)` }">
        <div class="pad" />
        <div class="ring" aria-label="Starter brains">
          <button
            v-for="(card, j) in cards"
            :key="card.brain.id"
            type="button"
            class="card"
            :class="{ on: card.on }"
            :style="card.style"
            :aria-pressed="card.on"
            :tabindex="card.on ? 0 : -1"
            @click="onCardClick(j)"
          >
            <span class="face">
              <span class="desig"><span>{{ card.brain.designation }}</span><span>v1.0</span></span>
              <span class="core" aria-hidden="true">
                <i class="r r1" /><i class="r r2" /><i class="r r3" /><i class="orb" />
              </span>
              <span class="name">{{ card.brain.name }}</span>
              <span class="role">{{ card.brain.role }}</span>
              <span class="slots" aria-hidden="true"><i v-for="n in 6" :key="n" /></span>
            </span>
            <span class="edge" />
            <span class="shade" />
          </button>
        </div>
      </div>
    </div>

    <aside class="panel right" aria-label="Priority stack">
      <h3>PRIORITY STACK <b>HOVER A LAYER</b></h3>
      <div class="stack">
        <div class="iso" aria-hidden="true">
          <div
            v-for="(name, i) in LAYERS"
            :key="name"
            class="layer"
            :class="{ em: i === 0, on: i === layer }"
            :style="{
              transform: `translateZ(${(LAYERS.length - 1 - i) * 22 + (i === layer ? 16 : 0)}px)${
                i === layer ? ' translate(-8px,-8px)' : ''
              }`,
            }"
            @mouseenter="setLayer(i)"
          />
        </div>
        <div class="labels">
          <button
            v-for="(name, i) in LAYERS"
            :key="name"
            type="button"
            :class="{ em: i === 0, on: i === layer }"
            :aria-pressed="i === layer"
            @mouseenter="setLayer(i)"
            @focus="setLayer(i)"
          >
            {{ name }}
          </button>
        </div>
      </div>
      <div class="detail" :style="{ '--card-accent': brain.accent }">
        <div class="cond">{{ detail.cond }}</div>
        <p>
          <DirectiveText :text="detail.text.slice(0, typed)" /><span
            v-if="typed < detail.text.length"
            class="caret"
          />
        </p>
      </div>
    </aside>

    <nav class="dots" aria-label="Brain slots">
      <button
        v-for="(b, j) in STARTER_BRAINS"
        :key="b.id"
        type="button"
        :class="{ on: j === current }"
        :aria-label="b.name"
        @click="goTo(j)"
      />
    </nav>

    <footer class="bottom">
      <span><kbd>A</kbd><kbd>D</kbd> BROWSE</span>
      <span><kbd>W</kbd><kbd>S</kbd> INSPECT LAYER</span>
      <button type="button" class="go" :disabled="linking" @click="link">
        <kbd>ENTER</kbd> LINK BRAIN
      </button>
    </footer>

    <div class="link" :class="{ on: linking }" aria-live="polite">
      <div v-if="linking" class="box">
        <small>NEURAL HANDSHAKE</small>
        <b>{{ brain.name.toUpperCase() }}</b>
        <div class="bar"><i :style="{ width: `${linkProgress}%` }" /></div>
        <small>{{ linkProgress < 100 ? `SYNC ${Math.floor(linkProgress)}%` : "LINK ESTABLISHED" }}</small>
      </div>
    </div>
    <div class="fx scan" />
    <div class="fx vig" />
  </main>
</template>

<style scoped>
.neural {
  --dim: var(--ink-dim);
  --faint: var(--ink-faint);
  --glass: rgba(12, 16, 20, 0.7);
  position: fixed;
  inset: 0;
  overflow: hidden;
  background: #05070a;
  user-select: none;
}

kbd {
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 600;
  min-width: 26px;
  text-align: center;
  display: inline-block;
  padding: 2px 6px;
  border: 1px solid currentColor;
  border-bottom-width: 3px;
  border-radius: 4px;
}

/* ---- world ---- */

.sky {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(ellipse 60% 40% at 50% 58%, color-mix(in srgb, var(--accent) 22%, transparent), transparent 70%),
    radial-gradient(ellipse 120% 60% at 50% 110%, #10161c, #05070a 70%);
  transition: background 0.8s;
}

.floor {
  position: absolute;
  left: -50%;
  right: -50%;
  top: 58%;
  height: 120%;
  transform-origin: top center;
  transform: perspective(500px) rotateX(72deg);
  background-image:
    linear-gradient(color-mix(in srgb, var(--accent) 45%, transparent) 1px, transparent 1px),
    linear-gradient(90deg, color-mix(in srgb, var(--accent) 45%, transparent) 1px, transparent 1px);
  background-size: 64px 64px;
  animation: floor-run 3s linear infinite;
  mask-image: linear-gradient(to bottom, transparent, #000 25%, #000 60%, transparent);
  opacity: 0.5;
}

@keyframes floor-run {
  to {
    background-position: 0 64px;
  }
}

.backword {
  position: absolute;
  left: 0;
  right: 0;
  top: 13%;
  text-align: center;
  font-family: var(--font-display);
  font-weight: 800;
  font-size: 22vw;
  line-height: 1;
  letter-spacing: -0.02em;
  color: transparent;
  -webkit-text-stroke: 1px rgba(232, 227, 213, 0.06);
  white-space: nowrap;
  transform: perspective(800px) rotateX(18deg);
  pointer-events: none;
}

.fx {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.fx.scan {
  background: repeating-linear-gradient(0deg, rgba(255, 255, 255, 0.02) 0 1px, transparent 1px 3px);
}

.fx.vig {
  background: radial-gradient(ellipse 80% 75% at 50% 50%, transparent 50%, rgba(0, 0, 0, 0.8));
}

/* ---- top ---- */

.top {
  position: absolute;
  top: 26px;
  left: 36px;
  right: 36px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  z-index: 5;
}

.brand {
  font-family: var(--font-display);
  font-weight: 800;
  letter-spacing: 0.24em;
  font-size: 20px;
  text-transform: uppercase;
  display: flex;
  gap: 12px;
  align-items: center;
}

.brand i {
  width: 26px;
  height: 26px;
  border: 3px solid var(--amber);
  transform: rotate(45deg);
}

.title {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  text-align: center;
}

.title small {
  display: block;
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.4em;
  color: var(--dim);
}

.title h1 {
  margin: 0;
  font-family: var(--font-display);
  font-weight: 800;
  font-size: 34px;
  line-height: 1.2;
  letter-spacing: 0.18em;
  text-transform: uppercase;
}

.steps {
  display: flex;
  gap: 6px;
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.2em;
  color: var(--faint);
  align-items: center;
}

.steps i {
  width: 36px;
  height: 4px;
  background: rgba(255, 255, 255, 0.1);
  transform: skewX(-30deg);
}

.steps i.on {
  background: var(--amber);
  box-shadow: 0 0 10px var(--amber);
}

/* ---- carousel ---- */

.stage {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 0;
  height: 0;
  perspective: 1300px;
  perspective-origin: 50% 30%;
}

.tilt {
  transform-style: preserve-3d;
  transition: transform 0.25s ease-out;
}

.ring {
  transform-style: preserve-3d;
  transform: translateZ(-820px);
}

.card {
  position: absolute;
  left: -125px;
  top: -190px;
  width: 250px;
  height: 360px;
  padding: 0;
  border: 0;
  background: none;
  color: var(--ink);
  font: inherit;
  text-align: left;
  transform-style: preserve-3d;
  cursor: pointer;
  transition: transform 0.9s cubic-bezier(0.25, 0.9, 0.25, 1), opacity 0.6s;
  backface-visibility: hidden;
}

.card:focus-visible {
  outline: none;
}

.card:focus-visible .face {
  box-shadow: inset 0 0 0 2px var(--amber);
}

.face {
  position: absolute;
  inset: 0;
  transform-style: preserve-3d;
  background:
    linear-gradient(160deg, rgba(255, 255, 255, 0.08), transparent 35%),
    linear-gradient(to bottom, rgba(18, 23, 28, 0.92), rgba(10, 13, 16, 0.96));
  clip-path: polygon(22px 0, 100% 0, 100% calc(100% - 22px), calc(100% - 22px) 100%, 0 100%, 0 22px);
  padding: 18px 20px;
  display: flex;
  flex-direction: column;
}

.edge {
  position: absolute;
  inset: 0;
  pointer-events: none;
  clip-path: polygon(22px 0, 100% 0, 100% calc(100% - 22px), calc(100% - 22px) 100%, 0 100%, 0 22px);
  background: linear-gradient(var(--c), transparent 30%, transparent 70%, var(--c));
  opacity: 0.35;
  -webkit-mask:
    linear-gradient(#000 0 0) content-box,
    linear-gradient(#000 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  padding: 1px;
}

.card.on .edge {
  opacity: 1;
}

.shade {
  position: absolute;
  inset: 0;
  background: #05070a;
  opacity: 0.5;
  transition: opacity 0.6s;
  clip-path: polygon(22px 0, 100% 0, 100% calc(100% - 22px), calc(100% - 22px) 100%, 0 100%, 0 22px);
  pointer-events: none;
}

.card.on .shade {
  opacity: 0;
}

.card .desig {
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.3em;
  color: var(--c);
  display: flex;
  justify-content: space-between;
}

.card .name {
  font-family: var(--font-display);
  font-weight: 800;
  font-size: 40px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  line-height: 1;
  margin-top: auto;
}

.card .role {
  font-size: 13px;
  color: var(--dim);
  margin-top: 6px;
}

.card .slots {
  display: flex;
  gap: 4px;
  margin-top: 14px;
}

.card .slots i {
  flex: 1;
  height: 5px;
  background: var(--c);
  opacity: 0.7;
  transform: skewX(-30deg);
}

.card .slots i:last-child {
  background: var(--danger);
}

/* the core: a 3D gyroscope */
.core {
  position: relative;
  display: block;
  width: 150px;
  height: 150px;
  margin: 22px auto 0;
  transform-style: preserve-3d;
}

.core i {
  position: absolute;
  display: block;
}

.core .orb {
  inset: 48px;
  border-radius: 50%;
  background: radial-gradient(
    circle at 38% 35%,
    #fff 0 6%,
    var(--c) 30%,
    color-mix(in srgb, var(--c) 30%, #000) 75%
  );
  box-shadow:
    0 0 30px var(--c),
    0 0 80px color-mix(in srgb, var(--c) 50%, transparent);
  animation: pulse 2.4s ease-in-out infinite;
}

.core .r {
  inset: 0;
  border-radius: 50%;
  border: 2px solid var(--c);
  transform-style: preserve-3d;
  opacity: 0.85;
}

.core .r::before {
  content: "";
  position: absolute;
  top: -5px;
  left: 50%;
  width: 8px;
  height: 8px;
  margin-left: -4px;
  background: var(--c);
  border-radius: 50%;
  box-shadow: 0 0 12px var(--c);
}

.core .r1 {
  animation: spin-a 6s linear infinite;
}

.core .r2 {
  inset: 14px;
  border-style: dashed;
  animation: spin-b 4.5s linear infinite;
}

.core .r3 {
  inset: 28px;
  border-width: 1px;
  animation: spin-c 8s linear infinite;
}

.card:not(.on) .core i {
  animation-play-state: paused;
}

@keyframes spin-a {
  from {
    transform: rotateX(70deg) rotateZ(0);
  }
  to {
    transform: rotateX(70deg) rotateZ(360deg);
  }
}

@keyframes spin-b {
  from {
    transform: rotateY(65deg) rotateZ(0);
  }
  to {
    transform: rotateY(65deg) rotateZ(-360deg);
  }
}

@keyframes spin-c {
  from {
    transform: rotateX(-40deg) rotateY(30deg) rotateZ(0);
  }
  to {
    transform: rotateX(-40deg) rotateY(30deg) rotateZ(360deg);
  }
}

@keyframes pulse {
  50% {
    transform: scale(1.08);
    filter: brightness(1.3);
  }
}

.pad {
  position: absolute;
  left: 50%;
  top: 210px;
  width: 900px;
  height: 240px;
  margin-left: -450px;
  border-radius: 50%;
  background: radial-gradient(ellipse, color-mix(in srgb, var(--accent) 35%, transparent), transparent 65%);
  transform: rotateX(90deg);
  filter: blur(4px);
}

/* ---- side panels ---- */

.panel {
  position: absolute;
  top: 50%;
  width: 330px;
  padding: 20px 22px;
  background: var(--glass);
  backdrop-filter: blur(8px);
  z-index: 4;
}

.panel h3 {
  font-family: var(--font-mono);
  font-weight: 500;
  font-size: 10px;
  letter-spacing: 0.32em;
  color: var(--dim);
  margin: 0 0 14px;
  display: flex;
  justify-content: space-between;
}

.panel h3 b {
  color: var(--accent);
  font-weight: 600;
}

.left {
  left: 36px;
  transform: translateY(-50%) perspective(900px) rotateY(12deg);
  transform-origin: left center;
  border-left: 2px solid var(--accent);
}

.right {
  right: 36px;
  transform: translateY(-50%) perspective(900px) rotateY(-12deg);
  transform-origin: right center;
  border-right: 2px solid var(--accent);
}

.radar {
  width: 100%;
  height: auto;
  overflow: visible;
}

.radar .grid {
  fill: none;
  stroke: rgba(255, 255, 255, 0.1);
}

.radar .shape {
  fill: color-mix(in srgb, var(--accent) 30%, transparent);
  stroke: var(--accent);
  stroke-width: 2;
  filter: drop-shadow(0 0 6px var(--accent));
}

.radar text {
  font-family: var(--font-mono);
  font-size: 9px;
  letter-spacing: 0.15em;
  fill: var(--dim);
}

.quote {
  font-family: var(--font-display);
  font-size: 24px;
  font-weight: 600;
  letter-spacing: 0.03em;
  margin-top: 10px;
  line-height: 1.15;
}

.flag {
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--faint);
  margin-top: 10px;
  letter-spacing: 0.1em;
}

/* isometric priority stack */
.stack {
  position: relative;
  height: 210px;
  perspective: 900px;
}

.iso {
  position: absolute;
  left: 20px;
  top: 70px;
  width: 130px;
  height: 130px;
  transform-style: preserve-3d;
  transform: rotateX(58deg) rotateZ(-42deg);
}

.layer {
  position: absolute;
  inset: 0;
  transform-style: preserve-3d;
  transition:
    transform 0.35s cubic-bezier(0.2, 0.8, 0.2, 1),
    background 0.3s;
  background: rgba(40, 50, 58, 0.75);
  border: 1px solid rgba(255, 255, 255, 0.18);
  cursor: pointer;
}

.layer.em {
  background: rgba(214, 75, 63, 0.55);
  border-color: var(--danger);
}

.layer.on {
  background: color-mix(in srgb, var(--accent) 65%, transparent);
  border-color: var(--accent);
  box-shadow: 0 0 24px var(--accent);
}

.labels {
  position: absolute;
  right: 0;
  top: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 6px 0 22px;
}

.labels button {
  background: none;
  border: 0;
  color: var(--faint);
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.16em;
  text-align: right;
  cursor: pointer;
  padding: 2px 0;
}

.labels button.on {
  color: var(--ink);
}

.labels button.on::before {
  content: "◀ ";
  color: var(--accent);
}

.labels button.em {
  color: var(--danger);
}

.detail {
  min-height: 108px;
  margin-top: 6px;
  padding-top: 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.detail .cond {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--amber);
  letter-spacing: 0.06em;
  margin-bottom: 6px;
}

.detail p {
  margin: 0;
  font-size: 14px;
  line-height: 1.5;
}

.detail :deep(.kw) {
  font-family: var(--font-mono);
  font-size: 0.86em;
  font-weight: 400;
  padding: 0 3px;
}

.caret {
  display: inline-block;
  width: 7px;
  height: 14px;
  background: var(--accent);
  vertical-align: -2px;
  animation: blink 1s steps(2) infinite;
}

@keyframes blink {
  50% {
    opacity: 0;
  }
}

/* ---- bottom ---- */

.bottom {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 28px;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 34px;
  font-family: var(--font-display);
  font-weight: 600;
  letter-spacing: 0.16em;
  font-size: 15px;
  color: var(--dim);
  z-index: 5;
}

.bottom span,
.bottom .go {
  display: flex;
  align-items: center;
  gap: 8px;
}

.bottom kbd {
  color: var(--ink);
}

.bottom .go {
  padding: 0;
  border: 0;
  background: none;
  font: inherit;
  letter-spacing: inherit;
  color: var(--amber);
  cursor: pointer;
}

.bottom .go kbd {
  color: #111;
  background: var(--amber);
  border-color: var(--amber);
}

.bottom .go:hover:not(:disabled) {
  filter: brightness(1.15);
}

.dots {
  position: absolute;
  left: 50%;
  bottom: 84px;
  transform: translateX(-50%);
  display: flex;
  gap: 10px;
  z-index: 5;
}

.dots button {
  width: 10px;
  height: 10px;
  padding: 0;
  background: none;
  transform: rotate(45deg);
  border: 1px solid var(--faint);
  transition: all 0.3s;
  cursor: pointer;
}

.dots button.on {
  background: var(--accent);
  border-color: var(--accent);
  box-shadow: 0 0 10px var(--accent);
}

/* ---- link sequence ---- */

.link {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  z-index: 10;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.3s;
}

.link.on {
  opacity: 1;
}

.link .box {
  text-align: center;
  padding: 26px 60px;
  background: rgba(5, 7, 10, 0.75);
  border-top: 2px solid var(--accent);
  border-bottom: 2px solid var(--accent);
  backdrop-filter: blur(4px);
}

.link small {
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.4em;
  color: var(--dim);
}

.link b {
  display: block;
  font-family: var(--font-display);
  font-weight: 800;
  font-size: 64px;
  letter-spacing: 0.14em;
  color: var(--accent);
  text-shadow: 0 0 30px var(--accent);
  line-height: 1.1;
}

.link .bar {
  width: 360px;
  height: 6px;
  margin: 12px auto 0;
  background: rgba(255, 255, 255, 0.1);
}

.link .bar i {
  display: block;
  height: 100%;
  background: var(--accent);
  box-shadow: 0 0 12px var(--accent);
}

@media (max-width: 1100px) {
  .panel {
    display: none;
  }

  .bottom {
    gap: 14px;
    font-size: 12px;
    flex-wrap: wrap;
  }

  .title h1 {
    font-size: 22px;
  }

  .steps {
    display: none;
  }

  .top {
    left: 16px;
    right: 16px;
  }
}
</style>
