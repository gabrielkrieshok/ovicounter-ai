<script setup>
/* Dev scaffolding, not a screen.
 *
 * Stands in for a screen that has not been built yet, so the flow stays
 * walkable from the first commit. Each route swaps to its real screen as that
 * build step lands; when the last one does, this file and every reference to it
 * are deleted.
 *
 * It deliberately looks nothing like the design — an unbuilt screen must never
 * be mistakable for a built one in a screenshot. */
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()
</script>

<template>
  <div class="placeholder">
    <div>
      <p class="tag">NOT BUILT YET</p>
      <h1>{{ route.meta.screen }}</h1>
      <p class="step">arrives in build step {{ route.meta.step }}</p>
    </div>
    <button class="back" @click="router.push({ name: 'welcome' })">← Welcome</button>
  </div>
</template>

<style scoped>
.placeholder {
  height: 100%;
  padding: var(--sp-22);
  background: repeating-linear-gradient(
    45deg,
    var(--panel),
    var(--panel) 10px,
    var(--paper) 10px,
    var(--paper) 20px
  );
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}
.tag {
  font: 600 11px var(--font-mono);
  color: var(--red);
  margin: 0 0 var(--sp-8);
}
h1 {
  font: 800 26px var(--font-sans);
  letter-spacing: -0.02em;
  margin: 0;
}
.step {
  font: 400 13px var(--font-sans);
  color: var(--muted);
  margin: var(--sp-5) 0 0;
}
.back {
  align-self: flex-start;
  height: var(--hit-min);
  padding: 0 var(--sp-14);
  border: var(--bd) solid var(--ink);
  border-radius: var(--r-small);
  background: var(--paper);
  font: 600 14px var(--font-sans);
}
</style>
