<script setup lang="ts">
// Labeled spec meter. Renders a continuous bar when `pct` is given,
// segment pips when `segments`/`total` are given.

withDefaults(
  defineProps<{
    label: string;
    display: string;
    pct?: number | undefined;
    segments?: number | undefined;
    total?: number | undefined;
    hint?: string | undefined;
  }>(),
  { pct: undefined, segments: undefined, total: undefined, hint: undefined },
);
</script>

<template>
  <div class="meter">
    <div class="head">
      <span class="label">{{ label }}</span>
      <span class="display">{{ display }}</span>
    </div>
    <div v-if="segments !== undefined && total" class="pips" aria-hidden="true">
      <span v-for="i in total" :key="i" class="pip" :class="{ on: i <= segments }" />
    </div>
    <div v-else-if="pct !== undefined" class="bar" aria-hidden="true">
      <span class="fill" :style="{ width: `${pct}%` }" />
    </div>
    <div v-if="hint" class="hint">{{ hint }}</div>
  </div>
</template>

<style scoped>
.meter {
  display: grid;
  gap: 5px;
}

.head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
}

.label {
  font-family: var(--font-mono);
  font-size: 9.5px;
  letter-spacing: 0.14em;
  color: var(--ink-faint);
}

.display {
  font-family: var(--font-mono);
  font-size: 12px;
  font-weight: 600;
  color: var(--ink);
}

.pips {
  display: flex;
  gap: 4px;
}

.pip {
  height: 6px;
  flex: 1;
  background: var(--line);
  clip-path: polygon(3px 0, 100% 0, calc(100% - 3px) 100%, 0 100%);
}

.pip.on {
  background: var(--card-accent, var(--amber));
}

.bar {
  height: 6px;
  background: var(--line);
  clip-path: polygon(3px 0, 100% 0, calc(100% - 3px) 100%, 0 100%);
}

.fill {
  display: block;
  height: 100%;
  background: var(--card-accent, var(--amber));
}

.hint {
  font-family: var(--font-mono);
  font-size: 9.5px;
  letter-spacing: 0.08em;
  color: var(--ink-dim);
}
</style>
