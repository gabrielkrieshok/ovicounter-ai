<script setup>
import { computed, onBeforeUnmount, provide, ref } from 'vue'
import { useRoute } from 'vue-router'

import AppBar from '@/components/AppBar.vue'
import ConfirmSheet from '@/components/ConfirmSheet.vue'
import StepStrip from '@/components/StepStrip.vue'

/* Three ways the same screens are framed.
 *
 * PHONE, below 430px: full-bleed. The device is the frame.
 *
 * FRAMED, 430–899px: the app draws itself inside a frame at exactly the design
 * viewport (380×788) so a screen can be checked against the handoff. Also
 * forced at any width by `?frame=1` in the page URL, for the same reason.
 *
 * LAPTOP, 900px and up (decided Sep 2026, docs/surpass-v1-brief.md §3): the
 * frame goes away and the stage screens split into two panes — the photograph
 * on the left at full height, the title, controls, legend and actions in a
 * right-hand column no narrower than the phone layout they were designed at.
 * Same components, same tokens, same copy; only the arrangement changes. The
 * audience for the next while is partners and funders on laptops, and a phone
 * in a void showed them a strip 380px wide on a 1440px screen. Each screen
 * carries its own `.wide` rules; this component only decides the mode and
 * provides it, because Refine chooses its image fit by it.
 *
 * All three run identical code — every screen fills its container and never
 * assumes 788px. The app bar is opted out of per route rather than in, so a
 * screen added later gets it by default. */

const LAPTOP_MIN_PX = 900 // tokens.css --laptop-min; media queries cannot read custom properties

const route = useRoute()
const showBar = computed(() => route.meta.chrome !== false)

const framedByQuery = new URLSearchParams(window.location.search).get('frame') === '1'
const laptopQuery = window.matchMedia(`(min-width: ${LAPTOP_MIN_PX}px)`)
const laptopViewport = ref(laptopQuery.matches)
const onChange = () => {
  laptopViewport.value = laptopQuery.matches
}
laptopQuery.addEventListener('change', onChange)
onBeforeUnmount(() => laptopQuery.removeEventListener('change', onChange))

const wide = computed(
  () => laptopViewport.value && !framedByQuery && route.query.frame !== '1',
)
provide('wideLayout', wide)
</script>

<template>
  <div class="harness" :class="{ wide }">
    <div class="device" :class="{ wide }">
      <AppBar v-if="showBar" />
      <!-- The phone's step row. The laptop draws the steps in each screen's
           left column instead (components/StepList.vue). -->
      <StepStrip v-if="showBar && !wide" />
      <div class="screen">
        <RouterView />
      </div>
      <ConfirmSheet />
    </div>
  </div>
</template>

<style scoped>
.harness {
  min-height: 100dvh;
  background: var(--panel);
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

/* Laptop: not the phone frame, but not edge to edge either — a panel on the
   desk (--panel), edged with the 3px ink rule and square like everything else
   (Field Manual brief §5), filling the window less a gutter. The rounded
   corner is the ?frame=1 phone frame's alone. Screens still just fill
   `.device`; none of them knows about this. */
.harness.wide {
  padding: var(--laptop-gutter);
}
.device.wide {
  border-radius: 0;
  width: 100%;
  max-width: var(--laptop-max-w);
  height: calc(100dvh - 2 * var(--laptop-gutter));
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
