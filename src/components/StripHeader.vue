<script setup>
import { computed } from 'vue'

import StepNumber from '@/components/StepNumber.vue'
import { useSteps } from '@/lib/use-steps'

/* One header for every stage screen: where you are, then what to do.
 *
 * An optional `label`-role eyebrow ("Strip 2 · Wednesday"), the screen title in
 * the `display` role, and below it whatever instruction the screen needs — a
 * sentence, the boxed TAP / HOLD / LINE row on Your fixes, the numbered steps
 * on the laptop. `aside` sits opposite the title for the one small control or
 * fact a screen keeps up there (Refine's photo toggle, Crop's strip badge, the
 * struck-through machine total on Strip result).
 *
 * Replaces the four different title bars the screens used to draw. */
defineProps({
  title: { type: String, required: true },
  eyebrow: { type: String, default: '' },
})

/* Which step this header heads, for the step-change animation in App.vue,
   which slides it from where that step's row was. Empty outside a strip. */
const { steps, current } = useSteps()
const stepKey = computed(() => (current.value >= 0 ? steps.value[current.value].key : undefined))
</script>

<template>
  <header class="strip-header" :data-step="stepKey">
    <div v-if="eyebrow" class="eyebrow t-label">{{ eyebrow }}</div>
    <div class="title-row">
      <StepNumber class="number" />
      <h1 class="title t-display">{{ title }}</h1>
      <div v-if="$slots.aside" class="aside"><slot name="aside" /></div>
    </div>
    <div v-if="$slots.default" class="instruction"><slot /></div>
  </header>
</template>

<style scoped>
.strip-header {
  padding: var(--sp-16) var(--sp-16) var(--sp-14);
  background: var(--paper);
  border-bottom: var(--bd) solid var(--ink);
}
.eyebrow {
  margin-bottom: var(--sp-5);
  color: var(--ink);
}
.title-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--sp-12);
}
.number {
  margin-top: 1px;
}
.title {
  flex: 1;
  margin: 0;
  min-width: 0;
  overflow-wrap: anywhere;
}
.aside {
  flex: none;
  display: flex;
  align-items: center;
  min-height: 38px;
}
.instruction {
  margin-top: var(--sp-10);
}
</style>
