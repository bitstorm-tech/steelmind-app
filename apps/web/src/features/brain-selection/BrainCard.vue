<script setup lang="ts">
import type { BrainSpec } from "./brains";
import { formatCondition } from "./brains";
import DirectiveText from "./DirectiveText.vue";

// One starter Brain as a firmware dump. Brains are software, not hardware —
// the card reads like a terminal readout instead of a spec plate. The whole
// card is a single toggle button (no nested interactive elements).

defineProps<{
  brain: BrainSpec;
  selected: boolean;
}>();

const emit = defineEmits<{ select: [] }>();

// The emergency protocol's fixed trigger is "WHEN OWN HP < threshold" (§47);
// reuse the canonical condition formatting for its label.
function emergencyLabel(brain: BrainSpec): string {
  return formatCondition({
    source: "OWN_HP",
    operator: "<",
    value: brain.emergency.hpThresholdPercent,
    unit: "percent",
  });
}
</script>

<template>
  <button
    type="button"
    class="card"
    :class="{ selected }"
    :style="{ '--card-accent': brain.accent }"
    :aria-pressed="selected"
    @click="emit('select')"
  >
    <span class="scanline" aria-hidden="true" />
    <span class="corner top" aria-hidden="true" />
    <span class="corner bottom" aria-hidden="true" />

    <span class="meta">
      <span class="desig">{{ brain.designation }}</span>
      <span class="dot" :class="{ on: selected }" aria-hidden="true" />
    </span>

    <span class="eyebrow">{{ brain.role }}</span>
    <span class="name">{{ brain.name }}</span>

    <span class="terminal">
      <span class="term-head">
        <span class="term-title">FIRMWARE DUMP</span>
        <span class="term-state">COMPLETE // VALID</span>
      </span>

      <span class="section">
        <span class="sec-label">CORE DIRECTIVE · ALWAYS ON</span>
        <DirectiveText class="sec-body" :text="brain.coreDirective" />
      </span>

      <span class="section">
        <span class="sec-label">OPENING DIRECTIVE · ROUNDS 1-3</span>
        <DirectiveText class="sec-body" :text="brain.openingDirective" />
      </span>

      <span v-for="(slot, i) in brain.triggerSlots" :key="i" class="section">
        <span class="sec-label">TRIGGER {{ i + 1 }}</span>
        <span class="t-line">
          <span class="t-cond">WHEN {{ formatCondition(slot.condition) }}</span>
          <span class="t-sep" aria-hidden="true">→</span>
          <DirectiveText class="sec-body" :text="slot.directive" />
        </span>
      </span>

      <span class="section emergency">
        <span class="sec-label">EMERGENCY · {{ emergencyLabel(brain) }}</span>
        <DirectiveText class="sec-body" :text="brain.emergency.directive" />
      </span>
    </span>

    <span class="cta" aria-hidden="true">
      {{ selected ? "BRAIN LOCKED" : "DEPLOY BRAIN" }}
      <span class="cta-mark">{{ selected ? "▮" : "▸" }}</span>
    </span>
  </button>
</template>

<style scoped>
.card {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 18px;
  text-align: left;
  font: inherit;
  color: inherit;
  background: var(--plate);
  border: 1px solid var(--line);
  cursor: pointer;
  transition:
    transform 130ms ease,
    border-color 130ms ease,
    box-shadow 130ms ease,
    background-color 130ms ease;
}

/* corner brackets activate on hover / selection */
.corner {
  position: absolute;
  width: 16px;
  height: 16px;
  border: 0 solid var(--card-accent, var(--amber));
  opacity: 0;
  transition: opacity 130ms ease;
}

.corner.top {
  top: -1px;
  left: -1px;
  border-top-width: 2px;
  border-left-width: 2px;
}

.corner.bottom {
  right: -1px;
  bottom: -1px;
  border-right-width: 2px;
  border-bottom-width: 2px;
}

/* faint horizontal scan texture instead of the blueprint figure */
.scanline {
  position: absolute;
  inset: 0;
  background-image: linear-gradient(
    rgba(232, 227, 213, 0.03) 1px,
    transparent 1px
  );
  background-size: 100% 3px;
  pointer-events: none;
  opacity: 0.5;
}

.card:hover {
  transform: translateY(-3px);
  border-color: var(--line-strong);
}

.card:hover .corner {
  opacity: 0.75;
}

.card.selected {
  border-color: var(--card-accent, var(--amber));
  background: var(--plate-raised);
  box-shadow: 0 0 28px -8px var(--card-accent, var(--amber));
}

.card.selected .corner {
  opacity: 1;
}

.meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.desig {
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.2em;
  color: var(--ink-faint);
}

.dot {
  width: 7px;
  height: 7px;
  border: 1px solid var(--line-strong);
}

.dot.on {
  border-color: var(--card-accent, var(--amber));
  background: var(--card-accent, var(--amber));
  box-shadow: 0 0 8px var(--card-accent, var(--amber));
}

.eyebrow {
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.22em;
  color: var(--card-accent, var(--amber));
}

.name {
  font-family: var(--font-display);
  font-size: 44px;
  font-weight: 700;
  line-height: 0.95;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--ink);
}

/* ---- firmware terminal ---- */

.terminal {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px 12px 13px;
  background: var(--bg-void);
  border: 1px solid var(--line);
}

.term-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding-bottom: 8px;
  border-bottom: 1px dashed var(--line);
}

.term-title {
  font-family: var(--font-mono);
  font-size: 8.5px;
  letter-spacing: 0.2em;
  color: var(--ink-faint);
}

.term-state {
  font-family: var(--font-mono);
  font-size: 8.5px;
  letter-spacing: 0.14em;
  color: var(--card-accent, var(--amber));
}

.section {
  display: grid;
  gap: 4px;
}

.sec-label {
  font-family: var(--font-mono);
  font-size: 8.5px;
  letter-spacing: 0.16em;
  color: var(--ink-faint);
}

.sec-body {
  font-family: var(--font-mono);
  font-size: 11px;
  line-height: 1.5;
  color: var(--ink-dim);
}

.t-line {
  display: block;
  font-family: var(--font-mono);
  font-size: 11px;
  line-height: 1.5;
  color: var(--ink-dim);
}

.t-cond {
  color: var(--card-accent, var(--amber));
}

.t-sep {
  margin: 0 5px;
  color: var(--ink-faint);
}

.section.emergency .sec-label {
  color: var(--danger);
}

.section.emergency .sec-body {
  color: var(--ink);
}

.cta {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin: 4px -18px -18px;
  padding: 12px 0;
  font-family: var(--font-display);
  font-size: 16px;
  font-weight: 600;
  letter-spacing: 0.18em;
  color: var(--ink-dim);
  border-top: 1px solid var(--line);
  transition: color 130ms ease;
}

.cta-mark {
  font-family: var(--font-mono);
  font-size: 11px;
}

.card:hover .cta,
.card.selected .cta {
  color: var(--card-accent, var(--amber));
}
</style>
