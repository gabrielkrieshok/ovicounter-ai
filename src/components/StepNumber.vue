<script setup>
import { useSteps } from '@/lib/use-steps'

/* The current step's number — 1 to 6, as the Guide numbers them — in a
 * yellow square beside a screen's title, so every screen in a strip says
 * which step it is (Oct 2026). Yellow because it is "you are here", the same
 * as the current step's edge in the step list. Renders nothing outside a
 * strip (Welcome, the Guide, Session summary). */
const { current } = useSteps()
</script>

<template>
  <span v-if="current >= 0" class="step-number t-title" aria-hidden="true">{{ current + 1 }}</span>
</template>

<style scoped>
.step-number {
  flex: none;
  width: 38px;
  height: 38px;
  display: grid;
  place-items: center;
  background: var(--action);
  border: var(--bd) solid var(--ink);
  color: var(--ink);
}
</style>
