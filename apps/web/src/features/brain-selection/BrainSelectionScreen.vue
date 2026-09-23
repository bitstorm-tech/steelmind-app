<script setup lang="ts">
import { computed, shallowRef } from "vue";
import BrainCard from "./BrainCard.vue";
import { STARTER_BRAINS } from "./brains";
import type { BrainId } from "./brains";

// Brain Selection (SPEC §60, §52). Local UI state only — selection and
// commit live here; App.vue owns the flow order. Starter Brains are factory
// firmware: complete, valid, and copied when customized (SPEC §52).

const emit = defineEmits<{ confirm: [id: BrainId] }>();

const selectedId = shallowRef<BrainId | null>(null);
const committedId = shallowRef<BrainId | null>(null);

const selectedBrain = computed(
  () => STARTER_BRAINS.find((b) => b.id === selectedId.value) ?? null,
);
const committedBrain = computed(
  () => STARTER_BRAINS.find((b) => b.id === committedId.value) ?? null,
);

function select(id: BrainId): void {
  selectedId.value = id;
  if (committedId.value !== null && committedId.value !== id) {
    committedId.value = null;
  }
}

function commit(): void {
  if (selectedId.value === null || committedId.value !== null) return;
  committedId.value = selectedId.value;
  emit("confirm", selectedId.value);
}

function reselect(): void {
  committedId.value = null;
}
</script>

<template>
  <main class="screen">
    <header class="topbar">
      <span class="brand">
        <span class="glyph" aria-hidden="true" />
        Steelmind
      </span>
      <span class="terminal">
        HANGAR 04 // NEURAL LOADER <span class="cursor" aria-hidden="true">▮</span>
      </span>
    </header>

    <section class="intro">
      <p class="crumb">NEURAL LOADER — COMPLETE FACTORY FIRMWARE</p>
      <h1 class="title">Select Your Brain</h1>
      <p class="lede">
        A Brain is software: one core doctrine, an opening read, three trigger
        slots, one emergency protocol. Five archetypes leave this bay fully
        compiled. Commit one and it is copied to your bay — the template stays
        on the shelf.
      </p>
    </section>

    <section class="grid" aria-label="Starter brains">
      <BrainCard
        v-for="(brain, i) in STARTER_BRAINS"
        :key="brain.id"
        :brain="brain"
        :selected="brain.id === selectedId"
        :style="{ animationDelay: `${i * 90}ms` }"
        @select="select(brain.id)"
      />
    </section>

    <p class="rules">
      DIRECTIVE LIMITS // CORE 200 · OPENING 140 · TRIGGER 120 · EMERGENCY 140 ·
      PRIORITY: EMERGENCY &gt; TRIGGER 1 &gt; TRIGGER 2 &gt; TRIGGER 3 &gt;
      OPENING &gt; CORE
    </p>

    <footer class="dock" :class="{ committed: committedId !== null }">
      <span class="readout" aria-live="polite">
        <span class="dock-dot" :class="{ on: selectedId !== null }" aria-hidden="true" />
        <template v-if="committedBrain">
          COMMITTED :: {{ committedBrain.name }} — {{ committedBrain.designation }}
        </template>
        <template v-else-if="selectedBrain">
          SELECTED :: {{ selectedBrain.name }} — {{ selectedBrain.designation }}
        </template>
        <template v-else>NO BRAIN LOADED — AWAITING PILOT INPUT</template>
      </span>
      <div class="actions">
        <button v-if="committedId !== null" type="button" class="ghost" @click="reselect">
          RESELECT
        </button>
        <button
          type="button"
          class="commit"
          :disabled="selectedId === null || committedId !== null"
          @click="commit"
        >
          {{ committedId !== null ? "COMMITTED" : "COMMIT BRAIN" }}
          <span aria-hidden="true">{{ committedId !== null ? "▮" : "▸" }}</span>
        </button>
      </div>
    </footer>
  </main>
</template>

<style scoped>
.screen {
  display: flex;
  flex-direction: column;
  min-height: 100dvh;
  max-width: 1240px;
  margin: 0 auto;
  padding: 0 clamp(20px, 4vw, 40px);
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
  background: repeating-linear-gradient(
    -45deg,
    var(--amber) 0 12px,
    transparent 12px 24px
  );
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
  padding: 44px 0 30px;
  max-width: 640px;
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

/* ---- card grid ---- */

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 22px;
  align-items: start;
}

.grid > :deep(.card) {
  animation: lock-in 0.45s ease-out backwards;
}

@keyframes lock-in {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
}

/* ---- global rules strip ---- */

.rules {
  margin: 26px 0 0;
  padding: 12px 0;
  border-top: 1px solid var(--line);
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.14em;
  text-align: center;
  color: var(--ink-faint);
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

.dock.committed {
  border-color: var(--amber);
  box-shadow: 0 -6px 24px -14px var(--amber);
}

.readout {
  display: flex;
  align-items: center;
  gap: 10px;
  font-family: var(--font-mono);
  font-size: 11.5px;
  letter-spacing: 0.1em;
  color: var(--ink-dim);
}

.dock-dot {
  width: 8px;
  height: 8px;
  border: 1px solid var(--line-strong);
}

.dock-dot.on {
  border-color: var(--amber);
  background: var(--amber);
  box-shadow: 0 0 8px var(--amber);
}

.actions {
  display: flex;
  gap: 10px;
}

.commit,
.ghost {
  font-family: var(--font-display);
  font-size: 15px;
  font-weight: 600;
  letter-spacing: 0.14em;
  padding: 10px 20px;
  border: none;
  cursor: pointer;
  clip-path: polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px);
}

.commit {
  color: #14181c;
  background: var(--amber);
  transition: filter 130ms ease;
}

.commit:hover:not(:disabled) {
  filter: brightness(1.12);
}

.commit:disabled {
  color: var(--ink-faint);
  background: var(--plate-raised);
  cursor: not-allowed;
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
</style>
