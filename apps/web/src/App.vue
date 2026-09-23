<script setup lang="ts">
import { shallowRef, watch } from "vue";
import BrainSelectionScreen from "./features/brain-selection/BrainSelectionScreen.vue";
import type { BrainId } from "./features/brain-selection/brains";
import LoadoutBriefing from "./features/loadout-briefing/LoadoutBriefing.vue";
import ProfileSelectionScreen from "./features/profile-selection/ProfileSelectionScreen.vue";
import type { ProfileId } from "./features/profile-selection/profiles";

// Root composition surface and minimal flow state machine (SPEC §60, §52):
// Brain Selection → Combat Profile Selection → Loadout summary (Match Screen
// follows). Feature state lives in the screens; only committed ids and the
// stage live here.

type Stage = "brain" | "profile" | "briefing";

const stage = shallowRef<Stage>("brain");
const brainId = shallowRef<BrainId | null>(null);
const profileId = shallowRef<ProfileId | null>(null);

watch(stage, () => {
  window.scrollTo(0, 0);
});

function onBrainConfirmed(id: BrainId): void {
  brainId.value = id;
  stage.value = "profile";
}

function onProfileConfirmed(id: ProfileId): void {
  profileId.value = id;
  stage.value = "briefing";
}

function reselectBrain(): void {
  stage.value = "brain";
}

function reselectProfile(): void {
  stage.value = "profile";
}
</script>

<template>
  <BrainSelectionScreen
    v-if="stage === 'brain'"
    @confirm="onBrainConfirmed"
  />
  <ProfileSelectionScreen
    v-else-if="stage === 'profile'"
    @confirm="onProfileConfirmed"
  />
  <LoadoutBriefing
    v-else-if="brainId !== null && profileId !== null"
    :brain-id="brainId"
    :profile-id="profileId"
    @reselect-brain="reselectBrain"
    @reselect-profile="reselectProfile"
  />
</template>
