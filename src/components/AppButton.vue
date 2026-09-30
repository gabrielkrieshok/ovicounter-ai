<script setup>
/* The one button, in three weights (Field Manual brief §2).
 *
 * `primary` — safety yellow, black `title` label, 3px ink outline, 76px. The
 * one thing to do next on a screen, and never more than one per screen. With
 * `bar` it runs edge to edge and keeps only the rule on top, the way the Done
 * bar sits at the foot of Your fixes.
 *
 * `secondary` — white, 3px ink outline, 52px. The other way out.
 *
 * `quiet` — underlined ink text in a ≥44px row. For a detour that must be
 * findable and must not compete: "Marks look wrong? Adjust them". Ink, not blue —
 * blue means a mark and nothing else.
 *
 * Heights are minimums, so a secondary beside a primary in one row stretches to
 * match it instead of sitting 24px short. */
defineProps({
  variant: { type: String, default: 'primary' }, // primary | secondary | quiet
  bar: { type: Boolean, default: false },
})
</script>

<template>
  <button
    class="btn"
    :class="[`v-${variant}`, variant === 'quiet' ? 't-body' : 't-title', { bar }]"
    type="button"
  >
    <slot />
  </button>
</template>

<style scoped>
.btn {
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
}

.v-primary,
.v-secondary {
  width: 100%;
  padding: var(--sp-8) var(--sp-16);
  border: var(--bd) solid var(--ink);
  border-radius: var(--r-primary);
  color: var(--ink);
}
.v-primary {
  min-height: var(--hit-primary);
  background: var(--action);
}
.v-secondary {
  min-height: var(--hit-secondary);
  background: var(--paper);
}

/* A bar keeps only its rule on top; a secondary beside a primary bar in one
   row (Undo | Done on the laptop) draws its own divider. */
.bar {
  border-width: var(--bd) 0 0;
}

.v-quiet {
  align-self: flex-start;
  min-height: var(--hit-min);
  color: var(--ink);
  text-decoration: underline;
  text-decoration-thickness: 2px;
  text-underline-offset: 4px;
}

.btn:active {
  opacity: 0.85;
}

.btn:disabled {
  cursor: default;
  opacity: 1;
}
.v-primary:disabled,
.v-secondary:disabled {
  background: var(--panel);
  color: var(--disabled);
  border-color: var(--rule-idle);
}
.v-quiet:disabled {
  color: var(--disabled);
}
</style>
