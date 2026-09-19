<script setup>
/* One strip's band, as a letter. Filled for the loud bands, outlined for the
   quiet ones, so a session's shape is readable at a glance without reading the
   letters at all. Which bands are loud is the band config's decision. */
defineProps({
  letter: { type: String, required: true },
  filled: { type: Boolean, default: false },
})
</script>

<template>
  <span class="badge" :class="{ filled }">{{ letter }}</span>
</template>

<style scoped>
.badge {
  font: 600 11px var(--font-mono);
  font-variant-numeric: tabular-nums;
  border: var(--bd-fine) solid var(--rule-idle);
  border-radius: var(--r-badge);
  padding: 2px 5px;
  color: var(--muted);
}
.badge.filled {
  border-color: var(--ink);
  background: var(--ink);
  color: var(--paper);
}
</style>
