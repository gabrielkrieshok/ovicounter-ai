<script setup>
/* The wordmark: the bot, then OVICOUNTER in the heaviest weight we ship beside
 * AI in the lightest.
 *
 * The lockup is carried over from the v1 app, which set `Ovicounter` at black
 * and `AI` at thin. In the Field Manual face that is Barlow Condensed 800
 * against 600, the lightest condensed weight shipped — nothing fetched at
 * runtime.
 *
 * Not translated, and deliberately not in the i18n bundles. A product name is
 * not copy; it reads the same in every locale, and putting it in `en.js` would
 * invite someone to translate it.
 *
 * The hi-fi's own wordmark is just "Ovicounter", because both source documents
 * listed "AI" among the banned words and the design followed its own rule. That
 * entry has since been removed (Aug 2026) — it is the product's name, and every
 * other word on that list is mechanism vocabulary. Design Brief v2 gives the
 * name as "Ovicounter AI" everywhere, and that is what this renders.
 */

defineProps({
  /* Cap height of the wordmark in pixels; the bot scales with it. */
  size: { type: Number, default: 22 },
})
</script>

<template>
  <span class="wordmark" :style="{ fontSize: `${size}px` }">
    <img
      class="bot"
      src="/icon.png"
      alt=""
      aria-hidden="true"
      :style="{ width: `${size * 1.55}px`, height: `${size * 1.55}px` }"
    />
    <span class="name"><b>OVICOUNTER</b><i>AI</i></span>
  </span>
</template>

<style scoped>
.wordmark {
  display: inline-flex;
  align-items: center;
  gap: 0.36em;
  line-height: 1;
}

.bot {
  display: block;
  flex: none;
}

.name {
  font-family: var(--font-display);
  white-space: nowrap;
}
.name b {
  font-weight: 800;
}
/* Light rather than italic — `i` is only the shortest tag for the second half
   of a lockup that has no semantic emphasis in it. */
.name i {
  font-weight: 600;
  font-style: normal;
  /* The two halves are one word in v1's lockup; a hair of space keeps the
     weight change readable without breaking it into two. */
  margin-left: 0.08em;
}
</style>
