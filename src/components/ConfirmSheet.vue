<script setup>
import AppButton from '@/components/AppButton.vue'
import { answer, confirmState } from '@/lib/confirm'

/* The app's one confirmation sheet (lib/confirm.js). Capped at the phone's
   width and centred, as the leave dialog was. Tapping the scrim stays. */
</script>

<template>
  <div v-if="confirmState.open" class="confirm" @click="answer(false)">
    <div class="confirm-sheet" role="dialog" aria-modal="true" @click.stop>
      <h2 class="title t-display">{{ confirmState.title }}</h2>
      <p class="body t-body">{{ confirmState.body }}</p>
      <AppButton variant="primary" @click="answer(false)">{{ confirmState.stay }}</AppButton>
      <AppButton variant="secondary" @click="answer(true)">{{ confirmState.go }}</AppButton>
    </div>
  </div>
</template>

<style scoped>
.confirm {
  position: absolute;
  inset: 0;
  z-index: 12;
  background: var(--scrim);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: var(--sp-16);
}
.confirm-sheet {
  width: 100%;
  max-width: var(--device-w);
  margin-top: min(22%, 84px);
  background: var(--paper);
  border: var(--bd) solid var(--ink);
  border-radius: var(--r-primary);
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: var(--sp-12);
}
.title {
  margin: 0;
}
.body {
  margin: 0 0 4px;
  color: var(--ink);
}
</style>
