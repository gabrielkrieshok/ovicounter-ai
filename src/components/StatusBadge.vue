<script setup>
/* A small square status tag in the `label` role: a band letter, "SAVED ON THIS
 * PHONE ✓", "WORKS OFFLINE ✓", "NOT CHECKED".
 *
 * `ink` states something true and settled. `muted` is a quieter or pending
 * state ("NOT SAVED", a quiet band). `filled` is a loud band. `dashed` is a
 * claim the app is declining to make — a strip whose marks nobody checked —
 * and borrows the dash from the proposed mark, the other thing in this app that
 * means "not yet looked at by a person". `onDark` inverts it for the app bar
 * and the photograph. */
defineProps({
  tone: { type: String, default: 'ink' }, // ink | muted | filled | dashed
  onDark: { type: Boolean, default: false },
})
</script>

<template>
  <span class="badge t-label" :class="[`tone-${tone}`, { 'on-dark': onDark }]"><slot /></span>
</template>

<style scoped>
.badge {
  display: inline-flex;
  align-items: center;
  white-space: nowrap;
  padding: 3px 6px;
  border: var(--bd-fine) solid var(--ink);
  border-radius: var(--r-badge);
  background: var(--paper);
  color: var(--ink);
  font-variant-numeric: tabular-nums;
}
.tone-muted {
  border-color: var(--rule-idle);
  color: var(--muted);
}
.tone-filled {
  background: var(--ink);
  color: var(--paper);
}
.tone-dashed {
  border-style: dashed;
  color: var(--muted);
  border-color: var(--muted);
}

.on-dark {
  background: var(--ink);
  color: var(--paper);
  border-color: var(--paper);
}
</style>
