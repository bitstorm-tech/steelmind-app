<script setup lang="ts">
import { computed } from "vue";
import type { CombatProfileSpec } from "./profiles";
import { ARMOR_PIPS, MOBILITY_PIPS } from "./profiles";
import MechSilhouette from "./MechSilhouette.vue";
import StatMeter from "./StatMeter.vue";

// One combat profile as a steel spec plate. The whole card is a single
// toggle button (no nested interactive elements).

const props = defineProps<{
  profile: CombatProfileSpec;
  selected: boolean;
}>();

const emit = defineEmits<{ select: [] }>();

// HP bars are scaled against the toughest chassis so the tonnage
// difference between profiles stays visible.
const MAX_PROFILE_HP = 220;

const hpPct = computed(() => Math.round((props.profile.hp / MAX_PROFILE_HP) * 100));
const armorPips = computed(() => ARMOR_PIPS[props.profile.armor]);
const mobilityPips = computed(() => MOBILITY_PIPS[props.profile.mobility]);
</script>

<template>
  <button
    type="button"
    class="card"
    :class="{ selected }"
    :style="{ '--card-accent': profile.accent }"
    :aria-pressed="selected"
    @click="emit('select')"
  >
    <span class="strip" aria-hidden="true" />
    <span class="corner top" aria-hidden="true" />
    <span class="corner bottom" aria-hidden="true" />

    <span class="meta">
      <span class="desig">{{ profile.designation }}</span>
      <span class="dot" :class="{ on: selected }" aria-hidden="true" />
    </span>

    <span class="eyebrow">{{ profile.role }}</span>
    <span class="name">{{ profile.name }}</span>

    <span class="figure">
      <MechSilhouette :profile-id="profile.id" :mech-name="profile.name" />
      <span class="mass">{{ profile.massTons }} t</span>
    </span>

    <span class="stats">
      <StatMeter label="STRUCTURAL HP" :display="String(profile.hp)" :pct="hpPct" />
      <StatMeter
        label="ARMOR CLASS"
        :display="profile.armor"
        :segments="armorPips"
        :total="3"
        :hint="`PASSIVE −${profile.armorReductionPct}% INCOMING`"
      />
      <StatMeter
        label="MOBILITY"
        :display="profile.mobility"
        :segments="mobilityPips"
        :total="3"
        :hint="`ADV ${profile.advanceMeters} m · CHARGE ${profile.chargeMeters} m`"
      />
    </span>

    <span class="weapons">
      <span class="weapon">
        <span class="w-head">MELEE · {{ profile.melee.rangeLabel }}</span>
        <span class="w-name">{{ profile.melee.name }}</span>
        <span class="w-stats">DMG {{ profile.melee.damage }} · EN {{ profile.melee.energy }}</span>
      </span>
      <span class="weapon">
        <span class="w-head">RANGED · {{ profile.ranged.rangeLabel }}</span>
        <span class="w-name">{{ profile.ranged.name }}</span>
        <span class="w-stats">DMG {{ profile.ranged.damage }} · EN {{ profile.ranged.energy }}</span>
      </span>
    </span>

    <span class="doctrine">{{ profile.doctrine }}</span>

    <span class="cta" aria-hidden="true">
      {{ selected ? "CHASSIS LOCKED" : "DEPLOY CHASSIS" }}
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
  padding: 18px 18px 0;
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

.strip {
  position: absolute;
  inset: 0 0 auto 0;
  height: 4px;
  background: repeating-linear-gradient(
    -45deg,
    var(--card-accent, var(--amber)) 0 10px,
    transparent 10px 20px
  );
  opacity: 0.22;
  transition: opacity 130ms ease;
}

.card:hover {
  transform: translateY(-3px);
  border-color: var(--line-strong);
}

.card:hover .strip,
.card:hover .corner {
  opacity: 0.75;
}

.card.selected {
  border-color: var(--card-accent, var(--amber));
  background: var(--plate-raised);
  box-shadow: 0 0 28px -8px var(--card-accent, var(--amber));
}

.card.selected .strip {
  opacity: 0.9;
  animation: march 1.1s linear infinite;
}

.card.selected .corner {
  opacity: 1;
}

@keyframes march {
  to {
    background-position-x: 28.28px;
  }
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
  background: transparent;
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

.figure {
  position: relative;
  margin: 2px -18px 0;
  padding: 12px 14px 6px;
  border-top: 1px solid var(--line);
  border-bottom: 1px solid var(--line);
  background-image:
    linear-gradient(rgba(232, 227, 213, 0.04) 1px, transparent 1px),
    linear-gradient(90deg, rgba(232, 227, 213, 0.04) 1px, transparent 1px);
  background-size: 22px 22px;
}

.mass {
  position: absolute;
  right: 14px;
  bottom: 8px;
  font-family: var(--font-display);
  font-size: 26px;
  font-weight: 600;
  letter-spacing: 0.06em;
  color: var(--ink-faint);
}

.stats,
.weapons {
  display: grid;
  gap: 10px;
}

.weapons {
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.weapon {
  display: grid;
  gap: 2px;
  padding: 8px 10px;
  background: var(--bg-void);
  border: 1px solid var(--line);
}

.w-head {
  font-family: var(--font-mono);
  font-size: 8.5px;
  letter-spacing: 0.16em;
  color: var(--ink-faint);
}

.w-name {
  font-family: var(--font-display);
  font-size: 16px;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.w-stats {
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--ink-dim);
}

.doctrine {
  font-size: 12.5px;
  line-height: 1.4;
  color: var(--ink-dim);
}

.cta {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin: 4px -18px 0;
  padding: 12px 0 calc(12px + 4px);
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

.card:hover .cta {
  color: var(--card-accent, var(--amber));
}

.card.selected .cta {
  color: var(--card-accent, var(--amber));
}
</style>
