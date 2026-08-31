<script setup lang="ts">
import type { ProfileId } from "./profiles";

// Hand-drawn angular mech silhouettes, rendered like technical blueprint
// figures: body paneling in dark steel, accent details (visors, weapon
// coils) in the chassis accent color, plus a height dimension line.

interface Limb {
  d: string;
  accent?: boolean;
}

interface Figure {
  limbs: Limb[];
  details: Limb[];
  dimensionTop: number;
  heightLabel: string;
}

const FIGURES: Record<ProfileId, Figure> = {
  BRAWLER: {
    limbs: [
      // exhaust stacks
      { d: "M92 30 h9 v14 h-9 Z" },
      { d: "M106 26 h9 v18 h-9 Z" },
      // back hump
      { d: "M80 42 L124 34 L138 58 L88 66 Z" },
      // torso
      { d: "M88 62 L136 54 L150 90 L84 98 Z" },
      // head
      { d: "M134 60 L152 56 L158 68 L140 72 Z" },
      // far arm
      { d: "M62 68 L82 64 L78 94 L58 96 Z" },
      // near arm
      { d: "M130 68 L152 62 L160 82 L140 88 Z" },
      // hammer head
      { d: "M150 52 L192 62 L186 90 L146 82 Z" },
      // hips
      { d: "M88 98 L134 92 L130 108 L84 112 Z" },
      // far leg + foot
      { d: "M62 108 L84 112 L76 134 L54 132 Z" },
      { d: "M48 128 L78 130 L80 140 L44 140 Z" },
      // near leg + foot
      { d: "M104 106 L128 110 L138 132 L116 136 Z" },
      { d: "M112 128 L142 130 L144 140 L108 140 Z" },
    ],
    details: [
      // visor
      { d: "M140 64 L152 61", accent: true },
      // hammer strike face
      { d: "M186 64 L181 88", accent: true },
      // back plating seam
      { d: "M86 66 L134 56", accent: false },
    ],
    dimensionTop: 26,
    heightLabel: "11.2 m",
  },
  ASSAULT: {
    limbs: [
      // antenna
      { d: "M100 30 L92 14" },
      // head
      { d: "M104 26 L124 26 L128 34 L122 40 L106 40 L100 34 Z" },
      // torso
      { d: "M86 46 L140 46 L148 86 L78 86 Z" },
      // shoulder far
      { d: "M68 48 L88 44 L90 68 L70 70 Z" },
      // shoulder near
      { d: "M136 48 L158 50 L154 74 L142 72 Z" },
      // near arm
      { d: "M150 56 L168 62 L164 80 L148 74 Z" },
      // railgun barrel
      { d: "M166 58 L198 66 L196 78 L164 72 Z" },
      // far arm
      { d: "M72 58 L84 56 L82 86 L70 88 Z" },
      // waist + pelvis
      { d: "M94 86 L132 86 L128 98 L98 98 Z" },
      { d: "M96 98 L128 98 L124 110 L100 110 Z" },
      // far leg + foot
      { d: "M100 110 L112 110 L108 138 L94 138 Z" },
      { d: "M88 132 L110 132 L112 140 L84 140 Z" },
      // near leg + foot
      { d: "M116 110 L128 110 L132 138 L118 138 Z" },
      { d: "M114 132 L138 132 L140 140 L112 140 Z" },
    ],
    details: [
      // visor
      { d: "M107 33 L121 33", accent: true },
      // railgun coils
      { d: "M174 60 L172 74", accent: true },
      { d: "M184 62 L182 76", accent: true },
      // chest vents
      { d: "M96 56 h18", accent: false },
      { d: "M96 62 h14", accent: false },
    ],
    dimensionTop: 14,
    heightLabel: "13.5 m",
  },
  SKIRMISHER: {
    limbs: [
      // crest
      { d: "M120 10 L124 16" },
      // head
      { d: "M118 16 L130 16 L132 24 L126 28 L116 28 L114 22 Z" },
      // neck
      { d: "M121 28 h6 v6 h-6 Z" },
      // torso
      { d: "M114 34 L136 34 L132 68 L116 68 Z" },
      // far arm
      { d: "M108 38 L116 36 L114 64 L106 66 Z" },
      // near arm
      { d: "M132 38 L142 36 L146 60 L136 62 Z" },
      // laser emitter
      { d: "M142 34 L158 40 L156 48 L140 44 Z" },
      // waist + pelvis
      { d: "M118 68 L130 68 L128 78 L120 78 Z" },
      { d: "M116 78 L132 78 L130 88 L118 88 Z" },
      // far leg (reverse joint)
      { d: "M114 88 L124 88 L122 104 L112 104 Z" },
      { d: "M112 102 L122 104 L114 124 L104 120 Z" },
      { d: "M100 120 L112 122 L116 138 L96 138 Z" },
      // near leg
      { d: "M124 88 L134 88 L136 104 L126 104 Z" },
      { d: "M126 102 L136 104 L130 126 L120 122 Z" },
      { d: "M118 122 L130 124 L134 138 L116 138 Z" },
    ],
    details: [
      // visor
      { d: "M119 21 L128 21", accent: true },
      // emitter tip
      { d: "M156 42 L160 44", accent: true },
      // chest vents
      { d: "M119 42 h10", accent: false },
      { d: "M119 48 h8", accent: false },
    ],
    dimensionTop: 10,
    heightLabel: "14.8 m",
  },
};

const props = defineProps<{
  profileId: ProfileId;
  mechName: string;
}>();

const figure = FIGURES[props.profileId];
</script>

<template>
  <svg
    class="sil"
    viewBox="0 0 220 150"
    role="img"
    :aria-label="`${mechName} blueprint silhouette`"
  >
    <!-- targeting reticle -->
    <circle cx="112" cy="80" r="46" class="reticle" />
    <line x1="112" y1="30" x2="112" y2="40" class="reticle" />
    <line x1="112" y1="120" x2="112" y2="130" class="reticle" />
    <!-- ground line -->
    <line x1="14" y1="140" x2="196" y2="140" class="ground" />
    <!-- mech -->
    <path
      v-for="(limb, i) in figure.limbs"
      :key="`l${i}`"
      :d="limb.d"
      class="limb"
    />
    <path
      v-for="(detail, i) in figure.details"
      :key="`d${i}`"
      :d="detail.d"
      :class="detail.accent ? 'detail-accent' : 'detail'"
    />
    <!-- height dimension -->
    <g class="dimension">
      <line x1="208" :y1="figure.dimensionTop" x2="208" y2="140" />
      <line :x1="204" :y1="figure.dimensionTop" :x2="212" :y2="figure.dimensionTop" />
      <line x1="204" y1="140" x2="212" y2="140" />
      <text
        :transform="`rotate(-90 215 ${(figure.dimensionTop + 140) / 2})`"
        :x="215"
        :y="(figure.dimensionTop + 140) / 2"
      >
        {{ figure.heightLabel }}
      </text>
    </g>
  </svg>
</template>

<style scoped>
.sil {
  display: block;
  width: 100%;
  height: auto;
}

.reticle {
  fill: none;
  stroke: var(--card-accent, var(--amber));
  stroke-width: 1;
  opacity: 0.14;
}

.ground {
  stroke: var(--line-strong);
  stroke-width: 1;
  opacity: 0.55;
}

.limb {
  fill: var(--mech-body);
  stroke: var(--mech-edge);
  stroke-width: 1.25;
  stroke-linejoin: miter;
}

.detail {
  fill: none;
  stroke: var(--mech-edge);
  stroke-width: 1;
  opacity: 0.6;
}

.detail-accent {
  fill: none;
  stroke: var(--card-accent, var(--amber));
  stroke-width: 2;
}

.dimension line {
  stroke: var(--ink-faint);
  stroke-width: 1;
}

.dimension text {
  fill: var(--ink-faint);
  font-family: var(--font-mono);
  font-size: 9px;
  text-anchor: middle;
  dominant-baseline: middle;
}
</style>
