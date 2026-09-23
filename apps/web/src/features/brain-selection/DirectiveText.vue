<script setup lang="ts">
import { computed } from "vue";
import { tokenizeDirective } from "./keywords";

// Renders one directive with gameplay keywords highlighted (SPEC §51).
const props = defineProps<{ text: string }>();

const tokens = computed(() => tokenizeDirective(props.text));
</script>

<template>
  <span class="directive-text">
    <template v-for="(token, i) in tokens" :key="i">
      <mark v-if="token.keyword" class="kw">{{ token.text }}</mark>
      <template v-else>{{ token.text }}</template>
    </template>
  </span>
</template>

<style scoped>
.directive-text {
  white-space: pre-wrap;
}

.kw {
  margin: 0;
  padding: 0 2px;
  font: inherit;
  font-weight: 600;
  color: var(--card-accent, var(--amber));
  background: color-mix(in srgb, var(--card-accent, var(--amber)) 12%, transparent);
}
</style>
