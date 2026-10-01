<script setup>
/* The Ovicounter AI mark (Oct 2026): a dashed ring round an egg — the app's
 * own "found by the app" mark, which is what the tool does. Ten segments in
 * the brand blue (--brand), gaps at twelve and six o'clock.
 *
 * Drawn here rather than loaded, so it is crisp at any size and the egg can
 * take the colour of the text beside it: ink on paper, paper on the black app
 * bar, where an ink egg would vanish. The icons in public/ are made from the
 * original artwork. */
defineProps({
  size: { type: Number, default: 24 },
})
</script>

<template>
  <svg class="logo" viewBox="0 0 100 100" :width="size" :height="size" aria-hidden="true">
    <path class="ring" d="M52.47 12.04A38.04 38.04 0 0 1 70.31 17.84L64.39 25.99A27.99 27.99 0 0 0 52.47 22.12ZM74.31 20.74A38.04 38.04 0 0 1 85.34 35.92L75.75 39.04A27.99 27.99 0 0 0 68.39 28.89ZM86.86 40.62A38.04 38.04 0 0 1 86.86 59.38L77.28 56.27A27.99 27.99 0 0 0 77.28 43.73ZM85.34 64.08A38.04 38.04 0 0 1 74.31 79.26L68.39 71.11A27.99 27.99 0 0 0 75.75 60.96ZM70.31 82.16A38.04 38.04 0 0 1 52.47 87.96L52.47 77.88A27.99 27.99 0 0 0 64.39 74.01ZM47.53 87.96A38.04 38.04 0 0 1 29.69 82.16L35.61 74.01A27.99 27.99 0 0 0 47.53 77.88ZM25.69 79.26A38.04 38.04 0 0 1 14.66 64.08L24.25 60.96A27.99 27.99 0 0 0 31.61 71.11ZM13.14 59.38A38.04 38.04 0 0 1 13.14 40.62L22.72 43.73A27.99 27.99 0 0 0 22.72 56.27ZM14.66 35.92A38.04 38.04 0 0 1 25.69 20.74L31.61 28.89A27.99 27.99 0 0 0 24.25 39.04ZM29.69 17.84A38.04 38.04 0 0 1 47.53 12.04L47.53 22.12A27.99 27.99 0 0 0 35.61 25.99Z" />
    <ellipse class="egg" cx="50" cy="50" rx="20.10" ry="7.34" transform="rotate(33 50 50)"/>
  </svg>
</template>

<style scoped>
.logo {
  display: block;
  flex: none;
}
.ring {
  fill: var(--brand);
  stroke: var(--brand);
  stroke-width: 0.8;
  stroke-linejoin: round;
}
.egg {
  fill: currentColor;
}
</style>
