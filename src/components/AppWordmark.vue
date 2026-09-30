<script setup>
/* The wordmark: OVICOUNTER in Barlow Condensed 800, then AI in 600.
 *
 * The weight contrast is carried over from the v1 lockup, which set
 * `Ovicounter` at black and `AI` at thin; 600 is the lightest condensed weight
 * shipped, and nothing is fetched at runtime.
 *
 * The bot icon that used to lead the lockup is gone from it (Sep 30, 2026):
 * every Field Manual mockup draws the name alone on the black bar, and at 22px
 * the bot was a smudge beside it. It is still the favicon and the install icon.
 *
 * Not translated, and deliberately not in the i18n bundles. A product name is
 * not copy; it reads the same in every locale, and putting it in `en.js` would
 * invite someone to translate it. "Ovicounter AI" is the name (Aug 2026) — the
 * hi-fi's "Ovicounter" alone followed a banned-word list that has since been
 * corrected.
 */

defineProps({
  size: { type: Number, default: 22 },
})
</script>

<template>
  <span class="wordmark" :style="{ fontSize: `${size}px` }"><b>OVICOUNTER</b><i>AI</i></span>
</template>

<style scoped>
.wordmark {
  font-family: var(--font-display);
  line-height: 1;
  white-space: nowrap;
}
.wordmark b {
  font-weight: 800;
}
/* Lighter rather than italic — `i` is only the shortest tag for the second
   half of a lockup that has no semantic emphasis in it. */
.wordmark i {
  font-weight: 600;
  font-style: normal;
  margin-left: 0.08em;
}
</style>
