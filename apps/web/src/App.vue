<script setup lang="ts">
import { PACKAGE_NAME } from "@steelmind/game-types";
</script>

<template>
  <main class="app">
    <h1 class="title">Steelmind</h1>
    <p class="hint">Scaffold ready. Shared types loaded from {{ PACKAGE_NAME }}.</p>
  </main>
</template>

<style scoped>
.app {
  font-family: system-ui, sans-serif;
  padding: 2rem;
}

.title {
  margin: 0 0 0.5rem;
}

.hint {
  margin: 0;
  opacity: 0.7;
}
</style>
