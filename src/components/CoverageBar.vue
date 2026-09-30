<script setup>
import { computed } from 'vue'

import { t } from '@/i18n'

/* How much of the strip the person has looked at close up: one segment per
 * part, filled once that part has been wholly on screen at zoom 2 or more, and
 * a count in words beside it.
 *
 * It measures the human's effort, never the machine's count, and it blocks
 * nothing — Done is always available. When `viewport` is given, the stretch of
 * the strip the stage is showing is outlined in --action, which is how the
 * laptop shows where you are without a second copy of the photograph. */
const props = defineProps({
  looked: { type: Array, required: true },
  viewport: { type: Object, default: null },
  /* `dark` over the stage band on the phone; `light` under the laptop photo. */
  tone: { type: String, default: 'light' },
})

const done = computed(() => props.looked.filter(Boolean).length)
</script>

<template>
  <div class="coverage" :class="tone">
    <div class="segments" aria-hidden="true">
      <span v-for="(on, i) in looked" :key="i" class="segment" :class="{ on }" />
      <span
        v-if="viewport"
        class="viewport"
        :style="{ left: `${viewport.x0 * 100}%`, width: `${(viewport.x1 - viewport.x0) * 100}%` }"
      />
    </div>
    <span class="label t-label">{{ t('fixes.lookedAt', { n: done, total: looked.length }) }}</span>
  </div>
</template>

<style scoped>
.coverage {
  display: flex;
  flex-direction: column;
  gap: var(--sp-5);
  min-width: 0;
}
.segments {
  position: relative;
  display: flex;
  gap: 3px;
  height: 14px;
}
.segment {
  flex: 1;
  border: var(--bd-inner) solid var(--ink);
  background: var(--paper);
}
.segment.on {
  background: var(--ink);
}
.viewport {
  position: absolute;
  top: -4px;
  bottom: -4px;
  border: var(--bd) solid var(--action);
  pointer-events: none;
}
.label {
  color: var(--ink);
}

.dark .segment {
  border-color: var(--paper);
  background: transparent;
}
.dark .segment.on {
  background: var(--paper);
}
.dark .label {
  color: var(--paper);
}
</style>
