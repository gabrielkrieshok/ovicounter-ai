<script setup>
import { ref } from 'vue'

import AppButton from '@/components/AppButton.vue'
import StepList from '@/components/StepList.vue'
import { t } from '@/i18n'
import { useSteps } from '@/lib/use-steps'

/* The phone's wayfinding: one 44px row under the app bar — a segment per step
 * and "Step 3 of 5 · Check the marks" — that opens the whole list as a sheet.
 *
 * The laptop's left column has room to be the list itself (StepList before and
 * after each screen). The phone does not: every pixel above the stage is
 * stage it loses. So the phone shows where you are in one row, and where you
 * can go when asked. */
const { steps, current, furthest, label } = useSteps()
const open = ref(false)
</script>

<template>
  <template v-if="current >= 0">
    <button class="strip" type="button" :aria-expanded="open" @click="open = true">
      <span class="segments" aria-hidden="true">
        <span
          v-for="(step, i) in steps"
          :key="step.key"
          class="seg t-label"
          :class="{
            done: i !== current && i <= furthest && !step.skipped,
            here: i === current,
            skipped: step.skipped,
          }"
        >{{ i + 1 }}</span>
      </span>
      <span class="where t-label">
        {{ t('steps.position', { n: current + 1, total: steps.length }) }} · {{ label(steps[current]) }}
      </span>
      <span class="more t-title" aria-hidden="true">▾</span>
    </button>

    <div v-if="open" class="scrim" @click="open = false">
      <div class="sheet" @click.stop>
        <StepList part="all" @went="open = false" />
        <AppButton variant="secondary" class="close" @click="open = false">{{ t('menu.close') }}</AppButton>
      </div>
    </div>
  </template>
</template>

<style scoped>
.strip {
  flex: none;
  width: 100%;
  min-height: var(--hit-min);
  display: flex;
  align-items: center;
  gap: var(--sp-10);
  padding: 0 var(--sp-16);
  background: var(--paper);
  border-bottom: var(--bd) solid var(--ink);
  color: var(--ink);
  text-align: left;
}
.segments {
  flex: none;
  display: flex;
  gap: 3px;
}
/* Six numbered squares, the Guide's numbers: filled when done, yellow where
   you are, struck through when this path skips the step. */
.seg {
  width: 20px;
  height: 20px;
  display: grid;
  place-items: center;
  font-size: 11px;
  border: var(--bd-inner) solid var(--ink);
  background: var(--paper);
  color: var(--ink);
}
.seg.done {
  background: var(--ink);
  color: var(--paper);
}
.seg.here {
  background: var(--action);
}
.seg.skipped {
  border-color: var(--rule-idle);
  color: var(--disabled);
  text-decoration: line-through;
}
.where {
  flex: 1;
  min-width: 0;
}
.more {
  flex: none;
}

.scrim {
  position: absolute;
  inset: 0;
  z-index: 10;
  background: var(--scrim);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: var(--sp-16);
}
.sheet {
  width: 100%;
  max-width: var(--device-w);
  background: var(--paper);
  border: var(--bd) solid var(--ink);
  display: flex;
  flex-direction: column;
}
.close {
  border-width: var(--bd) 0 0;
}
</style>
