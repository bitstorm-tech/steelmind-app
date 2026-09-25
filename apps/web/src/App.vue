<script setup lang="ts">
import { shallowRef, watch } from "vue";
import BrainSelectionScreen from "./features/brain-selection/BrainSelectionScreen.vue";
import type { BrainId } from "./features/brain-selection/brains";
import LoadoutBriefing from "./features/loadout-briefing/LoadoutBriefing.vue";
import ProfileSelectionScreen from "./features/profile-selection/ProfileSelectionScreen.vue";
import type { ProfileId } from "./features/profile-selection/profiles";
import SimulatorScreen from "./features/simulator/SimulatorScreen.vue";
import type { Loadout } from "./features/simulator/simulation";

// Root composition surface and minimal flow state machine (SPEC §60, §52):
// Brain Selection → Combat Profile Selection → Loadout summary (Match Screen
// follows). The Simulator is a side bay reachable from Brain Selection and the
// loadout summary. Feature state lives in the screens; only committed ids and
// the stage live here.

type Stage = "brain" | "profile" | "briefing" | "simulator";

const stage = shallowRef<Stage>("brain");
const brainId = shallowRef<BrainId | null>(null);
const profileId = shallowRef<ProfileId | null>(null);
// Where BACK in the Simulator returns to.
const simulatorReturn = shallowRef<Stage>("brain");

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

function openSimulator(): void {
  simulatorReturn.value = stage.value;
  stage.value = "simulator";
}

function closeSimulator(): void {
  stage.value = simulatorReturn.value;
}

// The committed loadout, if complete, pre-fills Mech A in the Simulator.
function committedLoadout(): Loadout | undefined {
  if (brainId.value === null || profileId.value === null) return undefined;
  return { brainId: brainId.value, profileId: profileId.value };
}
</script>

<template>
  <BrainSelectionScreen
    v-if="stage === 'brain'"
    @confirm="onBrainConfirmed"
    @simulate="openSimulator"
  />
  <ProfileSelectionScreen
    v-else-if="stage === 'profile'"
    :brain-id="brainId"
    @confirm="onProfileConfirmed"
    @back="reselectBrain"
  />
  <SimulatorScreen
    v-else-if="stage === 'simulator'"
    :initial="{ A: committedLoadout() }"
    @back="closeSimulator"
  />
  <LoadoutBriefing
    v-else-if="brainId !== null && profileId !== null"
    :brain-id="brainId"
    :profile-id="profileId"
    @reselect-brain="reselectBrain"
    @reselect-profile="reselectProfile"
    @simulate="openSimulator"
  />
</template>
