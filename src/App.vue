<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'

import AppBar from '@/components/AppBar.vue'

/* The phone frame is chrome, not layout.
 *
 * On a desktop the app draws itself inside a frame at exactly the design
 * viewport (380×788) so a screen can be checked against the handoff. On a real
 * phone the frame disappears and the same screens go full-bleed. Both paths run
 * identical code — every screen fills its container and never assumes 788px.
 *
 * The app bar is opted out of per route rather than in, so a screen added later
 * gets it by default and any screen that should not have one has to say so. */
const route = useRoute()
const showBar = computed(() => route.meta.chrome !== false)
</script>

<template>
  <div class="harness">
    <div class="device">
      <AppBar v-if="showBar" />
      <div class="screen">
        <RouterView />
      </div>
    </div>
  </div>
</template>

<style scoped>
.harness {
  min-height: 100dvh;
  background: var(--desk);
  display: grid;
  place-items: center;
}

.device {
  width: var(--device-w);
  height: var(--device-h);
  border: var(--bd) solid var(--ink);
  border-radius: var(--r-device);
  overflow: hidden;
  position: relative;
  background: var(--paper);
  display: flex;
  flex-direction: column;
}

/* Screens still fill whatever they are given and still know nothing about the
   bar above them — `min-height: 0` is what lets them shrink instead of
   overflowing the frame when the bar takes its 52px. */
.screen {
  flex: 1;
  min-height: 0;
  position: relative;
}

/* Below the frame's own width there is nothing to frame — go full-bleed and
   let the screens have the whole device. */
@media (max-width: 429px) {
  .harness {
    display: block;
    min-height: 100dvh;
  }
  .device {
    width: 100%;
    height: 100dvh;
    border: 0;
    border-radius: 0;
  }
}
</style>
