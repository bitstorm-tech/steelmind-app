<script setup lang="ts">
// Root composition surface. Future screens (brain selection, match view)
// will be composed here; for now the flow starts at profile selection.
import ProfileSelectionScreen from "./features/profile-selection/ProfileSelectionScreen.vue";
</script>

<template>
  <ProfileSelectionScreen />
</template>
