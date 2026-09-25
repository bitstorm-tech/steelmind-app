<script setup lang="ts">
import { computed } from "vue";
import type { BrainId } from "../brain-selection/brains";
import { STARTER_BRAINS } from "../brain-selection/brains";
import DirectiveText from "../brain-selection/DirectiveText.vue";
import type { ProfileId } from "../profile-selection/profiles";
import { COMBAT_PROFILES } from "../profile-selection/profiles";

// Interim loadout summary between profile commit and the Match Screen.
// Read-only recap plus the option to re-pick either half of the loadout.

const props = defineProps<{
  brainId: BrainId;
  profileId: ProfileId;
}>();

const emit = defineEmits<{
  reselectBrain: [];
  reselectProfile: [];
  simulate: [];
}>();

const brain = computed(
  () => STARTER_BRAINS.find((b) => b.id === props.brainId) ?? null,
);
const profile = computed(
  () => COMBAT_PROFILES.find((p) => p.id === props.profileId) ?? null,
);
</script>

<template>
  <main v-if="brain && profile" class="screen">
    <header class="topbar">
      <span class="brand">
        <span class="glyph" aria-hidden="true" />
        Steelmind
      </span>
      <span class="terminal">
        HANGAR 04 // LOADOUT BAY <span class="cursor" aria-hidden="true">▮</span>
      </span>
    </header>

    <section class="intro">
      <p class="crumb">DEPLOYMENT CHECK — BRAIN + CHASSIS LOCKED</p>
      <h1 class="title">Loadout Ready</h1>
      <p class="lede">
        Software and steel, committed. The Match Screen follows — until the
        engine dock is wired, this bay holds your loadout.
      </p>
    </section>

    <section class="panels" aria-label="Committed loadout">
      <article class="panel brain" :style="{ '--card-accent': brain.accent }">
        <span class="p-head">
          <span class="p-tag">BRAIN // {{ brain.designation }}</span>
          <span class="p-on">LOADED</span>
        </span>
        <h2 class="p-name">{{ brain.name }}</h2>
        <p class="p-role">{{ brain.role }}</p>
        <div class="p-directive">
          <span class="p-label">CORE DIRECTIVE</span>
          <DirectiveText :text="brain.coreDirective" />
        </div>
        <div class="p-facts">
          <span>TRIGGERS 3/3</span>
          <span>EMERGENCY &lt; {{ brain.emergency.hpThresholdPercent }}% HP</span>
        </div>
      </article>

      <article class="panel profile" :style="{ '--card-accent': profile.accent }">
        <span class="p-head">
          <span class="p-tag">CHASSIS // {{ profile.designation }}</span>
          <span class="p-on">DEPLOYED</span>
        </span>
        <h2 class="p-name">{{ profile.name }}</h2>
        <p class="p-role">{{ profile.role }}</p>
        <div class="p-directive">
          <span class="p-label">DOCTRINE</span>
          <span>{{ profile.doctrine }}</span>
        </div>
        <div class="p-facts">
          <span>{{ profile.hp }} HP · {{ profile.armor }} ARMOR</span>
          <span>{{ profile.mobility }} MOBILITY · {{ profile.massTons }} t</span>
        </div>
      </article>
    </section>

    <p class="note">
      MATCH SCREEN FOLLOWS — TEST THIS LOADOUT IN THE SIM BAY
      <span class="cursor" aria-hidden="true">▮</span>
    </p>

    <footer class="dock">
      <span class="readout">
        <span class="dock-dot on" aria-hidden="true" />
        {{ brain.name }} ON {{ profile.name }} — LOADOUT COMMITTED
      </span>
      <div class="actions">
        <button type="button" class="ghost" @click="emit('reselectBrain')">
          RESELECT BRAIN
        </button>
        <button type="button" class="ghost" @click="emit('reselectProfile')">
          RESELECT PROFILE
        </button>
        <button type="button" class="go" @click="emit('simulate')">
          SIMULATE
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

/* ---- summary panels ---- */

.panels {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 22px;
  align-items: stretch;
}

.panel {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 18px;
  background: var(--plate);
  border: 1px solid var(--line);
  border-top: 3px solid var(--card-accent, var(--amber));
  animation: lock-in 0.45s ease-out backwards;
}

.panel.brain {
  animation-delay: 0ms;
}

.panel.profile {
  animation-delay: 120ms;
}

@keyframes lock-in {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
}

.p-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.p-tag {
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.2em;
  color: var(--ink-faint);
}

.p-on {
  font-family: var(--font-mono);
  font-size: 9px;
  letter-spacing: 0.16em;
  color: var(--card-accent, var(--amber));
}

.p-name {
  margin: 0;
  font-family: var(--font-display);
  font-size: 40px;
  font-weight: 700;
  line-height: 0.95;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--ink);
}

.p-role {
  margin: 0;
  font-family: var(--font-mono);
  font-size: 10.5px;
  letter-spacing: 0.14em;
  color: var(--ink-dim);
}

.p-directive {
  display: grid;
  gap: 5px;
  padding: 12px;
  background: var(--bg-void);
  border: 1px solid var(--line);
  font-family: var(--font-mono);
  font-size: 11px;
  line-height: 1.55;
  color: var(--ink-dim);
  white-space: pre-wrap;
}

.p-label {
  font-size: 8.5px;
  letter-spacing: 0.16em;
  color: var(--ink-faint);
}

.p-facts {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: auto;
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.1em;
  color: var(--ink-faint);
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
}

.dock-dot {
  width: 8px;
  height: 8px;
  border: 1px solid var(--amber);
  background: var(--amber);
  box-shadow: 0 0 8px var(--amber);
}

.actions {
  display: flex;
  gap: 10px;
}

.ghost {
  font-family: var(--font-display);
  font-size: 15px;
  font-weight: 600;
  letter-spacing: 0.14em;
  padding: 10px 20px;
  color: var(--ink-dim);
  background: transparent;
  border: 1px solid var(--line-strong);
  cursor: pointer;
  clip-path: polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px);
}

.ghost:hover {
  color: var(--ink);
  border-color: var(--ink-faint);
}

.go {
  font-family: var(--font-display);
  font-size: 15px;
  font-weight: 700;
  letter-spacing: 0.14em;
  padding: 10px 20px;
  color: #14181c;
  background: var(--amber);
  border: 1px solid var(--amber);
  cursor: pointer;
  clip-path: polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px);
}

.go:hover {
  background: #ffc34d;
}
</style>
