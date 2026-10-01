<script setup>
/* Small drawings for the Guide, one per step, in the same flat ink-on-paper
 * language as Welcome's mark picture (MarkIntro): the paper is --panel ruled
 * in ink, eggs are ink, and a colour appears only where it means what it means
 * everywhere else — cyan for the crop box, the mark hues for marks, yellow for
 * the action, pink for the calibration tick.
 *
 * Drawings, not screenshots: they stay true whatever the screens look like
 * next month, cost nothing to load, and cannot be mistaken for a count. */
defineProps({
  kind: { type: String, required: true }, // photo | crop | measure | refine | count
})

/* A few eggs on a strip, reused by several drawings. */
const EGGS = [
  [34, 30, 20], [58, 50, -30], [82, 26, 60], [104, 46, 10], [128, 30, -50],
  [150, 52, 35], [174, 28, -15], [196, 48, 70], [218, 30, 5], [242, 50, -40],
]
</script>

<template>
  <svg class="art" viewBox="0 0 280 96" aria-hidden="true">
    <!-- Photograph: a phone held over the strip, the strip filling its box. -->
    <template v-if="kind === 'photo'">
      <rect x="2" y="12" width="276" height="72" class="paper" />
      <g v-for="([x, y, a], i) in EGGS" :key="i">
        <ellipse :cx="x" :cy="y + 12" rx="5" ry="2" :transform="`rotate(${a} ${x} ${y + 12})`" class="egg" />
      </g>
      <rect x="96" y="2" width="88" height="92" class="phone" />
      <rect x="104" y="18" width="72" height="60" class="guide-box" />
      <rect x="128" y="84" width="24" height="6" class="action" />
    </template>

    <!-- Crop: the box around the strip, corners to drag. -->
    <template v-else-if="kind === 'crop'">
      <rect x="0" y="0" width="280" height="96" class="stage" />
      <g transform="rotate(-4 140 48)">
        <rect x="22" y="20" width="236" height="56" class="paper" />
        <g v-for="([x, y, a], i) in EGGS" :key="i">
          <ellipse :cx="x + 4" :cy="y * 0.55 + 28" rx="4.5" ry="1.8" :transform="`rotate(${a} ${x + 4} ${y * 0.55 + 28})`" class="egg" />
        </g>
      </g>
      <rect x="18" y="14" width="244" height="68" class="crop-box" />
      <rect v-for="([x, y], i) in [[18, 14], [262, 14], [18, 82], [262, 82]]" :key="`h${i}`" :x="x - 6" :y="y - 6" width="12" height="12" class="handle" />
    </template>

    <!-- Measure: one typical egg, and every egg like it marked. -->
    <template v-else-if="kind === 'measure'">
      <rect x="2" y="12" width="276" height="72" class="paper" />
      <g v-for="([x, y, a], i) in EGGS" :key="i">
        <ellipse :cx="x" :cy="y + 12" rx="5" ry="2" :transform="`rotate(${a} ${x} ${y + 12})`" class="egg" />
        <circle :cx="x" :cy="y + 12" r="9" class="ring found" />
      </g>
      <circle :cx="EGGS[4][0]" :cy="EGGS[4][1] + 12" r="14" class="ring sample" />
    </template>

    <!-- Refine: the two sliders, square thumbs, the pink tick. -->
    <template v-else-if="kind === 'refine'">
      <rect x="10" y="24" width="260" height="8" class="track" />
      <rect x="138" y="14" width="28" height="28" class="thumb" />
      <rect x="10" y="66" width="260" height="8" class="track" />
      <rect x="70" y="56" width="28" height="28" class="thumb" />
      <rect x="178" y="58" width="4" height="24" class="tick" />
    </template>

    <!-- Count: the person's number over the band scale. -->
    <template v-else-if="kind === 'count'">
      <text x="0" y="46" class="numeral">364</text>
      <rect v-for="([x, w, on], i) in [[0, 40, 0], [46, 60, 0], [112, 80, 0], [198, 80, 1]]" :key="`z${i}`" :x="x + 1.5" y="62" :width="w" height="22" :class="on ? 'zone on' : 'zone'" />
      <rect x="250" y="50" width="3" height="12" class="stem" />
    </template>
  </svg>
</template>

<style scoped>
.art {
  display: block;
  width: 100%;
  max-width: 420px;
  height: auto;
}
.paper {
  fill: var(--panel);
  stroke: var(--ink);
  stroke-width: 2.5;
}
.stage {
  fill: var(--stage-bg);
}
.egg {
  fill: var(--ink);
}
.phone {
  fill: none;
  stroke: var(--ink);
  stroke-width: 3;
}
.guide-box {
  fill: none;
  stroke: var(--ink);
  stroke-width: 1.5;
  stroke-dasharray: 4 3;
}
.action {
  fill: var(--action);
  stroke: var(--ink);
  stroke-width: 1.5;
}
.crop-box {
  fill: none;
  stroke: var(--cyan);
  stroke-width: 3;
}
.handle {
  fill: var(--paper);
  stroke: var(--ink);
  stroke-width: 2;
}
.ring {
  fill: none;
  stroke-width: 2;
}
.ring.found {
  stroke: var(--blue);
  stroke-dasharray: 3.5 2.5;
}
.ring.sample {
  stroke: var(--ink);
  stroke-width: 2.5;
}
.track {
  fill: var(--panel);
  stroke: var(--ink);
  stroke-width: 2;
}
.thumb {
  fill: var(--ink);
}
.tick {
  fill: var(--pink);
}
.numeral {
  font: 700 46px var(--font-mono);
  fill: var(--ink);
}
.zone {
  fill: var(--panel);
  stroke: var(--rule-idle);
  stroke-width: 2.5;
}
.zone.on {
  fill: var(--ink);
  stroke: var(--ink);
}
.stem {
  fill: var(--ink);
}
</style>
