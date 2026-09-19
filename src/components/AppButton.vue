<script setup>
/* The one button.
 *
 * Height carries the hierarchy (62 primary / 52 secondary / 44 minimum), and
 * everything else follows from it: radius is r-primary at 62 and r-panel below,
 * weight is 700 when filled and 600 when outlined. Only font size varies enough
 * across the handoff to be worth a prop.
 *
 * `paper` is the filled button drawn on the dark stage — Crop's "Use this
 * photo". Same weight and radius as `filled`, inverted so it reads as primary
 * against #2a241d instead of disappearing into it. */
defineProps({
  variant: { type: String, default: 'filled' }, // filled | outline | paper
  size: { type: Number, default: 62 }, // 62 | 52 | 44
  font: { type: Number, default: 18 },
})
</script>

<template>
  <button
    class="btn"
    :class="[`v-${variant}`, size >= 62 ? 'r-primary' : 'r-panel']"
    :style="{ height: `${size}px`, fontSize: `${font}px` }"
  >
    <slot />
  </button>
</template>

<style scoped>
.btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-sans);
  line-height: 1;
  border: var(--bd) solid transparent;
}

.r-primary { border-radius: var(--r-primary); }
.r-panel { border-radius: var(--r-panel); }

.v-filled {
  background: var(--ink);
  color: var(--paper);
  font-weight: 700;
}

.v-outline {
  background: var(--paper);
  color: var(--ink);
  border-color: var(--ink);
  font-weight: 600;
}

.v-paper {
  background: var(--paper);
  color: var(--ink);
  border-color: var(--ink);
  font-weight: 700;
}

.btn:active { opacity: 0.85; }

.btn:disabled {
  color: var(--disabled);
  border-color: var(--rule-idle);
  opacity: 1;
}
.v-filled:disabled {
  background: var(--rule-idle);
  color: var(--paper);
}
</style>
