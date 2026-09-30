<script setup>
import { t } from '@/i18n'

/* − / zoom level / + as joined 52px square buttons.
 *
 * Pinch, the wheel and Shift-drag all still work; this is for the person who
 * does not know they do. Buttons, not a slider — a slider is one more thing
 * that could be mistaken for a setting that changes the count. The level is
 * shown on the laptop and left out on the phone, where the rail sits over the
 * corner of the photograph and every pixel of it is strip. */
defineProps({
  zoom: { type: Number, required: true },
  max: { type: Number, default: 8 },
  showLevel: { type: Boolean, default: true },
})
const emit = defineEmits(['zoom'])
</script>

<template>
  <div class="rail">
    <button
      class="step t-title"
      type="button"
      :aria-label="t('fixes.zoomOut')"
      :disabled="zoom <= 1.001"
      @click="emit('zoom', 1 / 1.5)"
    >
      −
    </button>
    <span v-if="showLevel" class="level t-label" aria-live="polite">{{ zoom.toFixed(1).replace(/\.0$/, '') }}×</span>
    <button
      class="step t-title"
      type="button"
      :aria-label="t('fixes.zoomIn')"
      :disabled="zoom >= max - 0.001"
      @click="emit('zoom', 1.5)"
    >
      +
    </button>
  </div>
</template>

<style scoped>
.rail {
  display: inline-flex;
  background: var(--paper);
  border: var(--bd) solid var(--ink);
}
.step,
.level {
  width: var(--hit-secondary);
  height: var(--hit-secondary);
  display: grid;
  place-items: center;
  color: var(--ink);
}
.step {
  font-size: 28px;
}
.step + .step,
.level,
.level + .step {
  border-left: var(--bd) solid var(--ink);
}
.level {
  width: auto;
  min-width: 64px;
  padding: 0 var(--sp-8);
}
.step:disabled {
  color: var(--disabled);
  cursor: default;
}
</style>
