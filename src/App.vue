<script setup>
import { computed, onBeforeUnmount, provide, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import AppBar from '@/components/AppBar.vue'
import ConfirmSheet from '@/components/ConfirmSheet.vue'
import StepStrip from '@/components/StepStrip.vue'
import { stepIndex } from '@/lib/steps'

/* Three ways the same screens are framed.
 *
 * PHONE, below 430px: full-bleed. The device is the frame.
 *
 * FRAMED, 430–899px: the app draws itself inside a frame at exactly the design
 * viewport (380×788) so a screen can be checked against the handoff. Also
 * forced at any width by `?frame=1` in the page URL, for the same reason.
 *
 * LAPTOP, 900px and up (decided Sep 2026, Surpass v1 brief §3): the
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

/* Moving between steps moves (Oct 2026): forward and back through the six
   steps the Guide numbers, so the app feels like going down that list. On a
   phone the next step slides in from the right — from the left going back.
   On a laptop the step rows stay where they are, the leaving step fades, and
   the new step's section unfolds between them: the accordion opening. Screens
   outside a strip (Welcome, Guide, Summary) change without motion, and so does
   everything for anyone whose device asks for reduced motion (CSS below). */
const stepMotion = ref('none')
const router = useRouter()

/* The accordion's motion, on the laptop. Just before a step change, note
   where every step-tagged row and header sits ([data-step]: StepList rows,
   StripHeader, the Processing and Strip result heads). When the next screen
   comes in, each of its own tagged elements starts where its counterpart was
   and slides home — the step just finished rises into the folded row, the
   next step's row rises to become the open header, the rows below drop to
   make room. The leaving screen fades under it; the open step's contents
   unfold (CSS below). */
const lastPlaces = new Map()
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
router.beforeEach((to, from) => {
  lastPlaces.clear()
  if (!wide.value || reduceMotion.matches) return
  if (stepIndex(from.name) < 0 || stepIndex(to.name) < 0) return
  for (const el of document.querySelectorAll('.screen [data-step]')) {
    lastPlaces.set(el.dataset.step, el.getBoundingClientRect().top)
  }
})
function slideRows(el) {
  if (!lastPlaces.size) return
  for (const node of el.querySelectorAll('[data-step]')) {
    const was = lastPlaces.get(node.dataset.step)
    if (was === undefined) continue
    const dy = was - node.getBoundingClientRect().top
    if (Math.abs(dy) < 1) continue
    node.animate([{ transform: `translateY(${dy}px)` }, { transform: 'none' }], {
      duration: 380,
      easing: 'cubic-bezier(0.2, 0.7, 0.2, 1)',
    })
  }
  lastPlaces.clear()
}
watch(
  () => route.name,
  (to, from) => {
    const a = stepIndex(from)
    const b = stepIndex(to)
    stepMotion.value = a >= 0 && b >= 0 && a !== b ? (b > a ? 'step-fwd' : 'step-back') : 'none'
  },
)
</script>

<template>
  <div class="harness" :class="{ wide }">
    <div class="device" :class="{ wide, page: wide && route.meta.page }">
      <AppBar v-if="showBar" />
      <!-- The phone's step row. The laptop draws the steps in each screen's
           left column instead (components/StepList.vue). -->
      <StepStrip v-if="showBar && !wide" />
      <div class="screen">
        <RouterView v-slot="{ Component }">
          <Transition :name="stepMotion" @enter="slideRows">
            <component :is="Component" :key="route.name" />
          </Transition>
        </RouterView>
      </div>
      <ConfirmSheet />
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

<!-- Not scoped: these classes land on the screens' root elements, and on the
     laptop on their children. -->
<style>
/* Laptop, reading pages (Welcome, Guide, About — `meta.page`): the panel
   grows with its content and the browser window scrolls, as a web page does,
   rather than a box inside the window. Stage screens keep the fixed panel:
   the photograph needs a known height to fit. */
.harness .device.wide.page {
  height: auto;
  min-height: calc(100dvh - 2 * var(--laptop-gutter));
  overflow: visible;
}
.harness .device.wide.page .screen {
  flex: none;
}
.harness .device.wide.page .screen > * {
  height: auto;
  min-height: calc(100dvh - 2 * var(--laptop-gutter) - var(--hit-secondary));
  overflow: visible;
}

/* Laptop: a stage screen whose left column — every step row, the open step,
   its actions — is taller than the window scrolls as a whole rather than
   cutting the column off. On a 900px-tall laptop nothing needs to. */
.device.wide:not(.page) .screen > * {
  overflow-y: auto;
}

/* While two screens overlap, the leaving one is lifted out of the flow. */
.screen > .step-fwd-leave-active,
.screen > .step-back-leave-active {
  position: absolute;
  inset: 0;
}
.screen > .step-fwd-enter-active,
.screen > .step-back-enter-active {
  position: relative;
  z-index: 1;
}

/* Phone: a slide. */
.step-fwd-enter-active,
.step-fwd-leave-active,
.step-back-enter-active,
.step-back-leave-active {
  transition: transform 280ms cubic-bezier(0.2, 0.7, 0.2, 1), opacity 280ms ease;
}
.step-fwd-enter-from { transform: translateX(100%); }
.step-fwd-leave-to { transform: translateX(-30%); opacity: 0; }
.step-back-enter-from { transform: translateX(-100%); }
.step-back-leave-to { transform: translateX(30%); opacity: 0; }

/* Laptop: the accordion. No slide; the leaving step fades, the step rows and
   the open header slide from their old places (slideRows, above), and the
   rest of the open step's column unfolds from the top while the photograph
   fades in. The root carries a transition
   of the same length so Vue keeps the classes on until the children finish. */
.wide .step-fwd-enter-from,
.wide .step-back-enter-from {
  transform: none;
  opacity: 0.99;
}
.wide .step-fwd-leave-to,
.wide .step-back-leave-to {
  transform: none;
  opacity: 0;
}
.wide .step-fwd-enter-active,
.wide .step-back-enter-active {
  transition: opacity 340ms linear;
}
.wide .step-fwd-leave-active,
.wide .step-back-leave-active {
  transition: opacity 200ms ease;
}
.wide :is(.step-fwd-enter-active, .step-back-enter-active)
  > :not(.steps-before, .steps-after, [data-step], .stage-wrap, .body, .viewfinder, .thumb, .under) {
  transition: clip-path 340ms cubic-bezier(0.2, 0.7, 0.2, 1);
}
.wide :is(.step-fwd-enter-from, .step-back-enter-from)
  > :not(.steps-before, .steps-after, [data-step], .stage-wrap, .body, .viewfinder, .thumb, .under) {
  clip-path: inset(0 0 100% 0);
}
.wide :is(.step-fwd-enter-active, .step-back-enter-active)
  > :is(.stage-wrap, .body, .viewfinder, .thumb, .under) {
  transition: opacity 340ms ease;
}
.wide :is(.step-fwd-enter-from, .step-back-enter-from)
  > :is(.stage-wrap, .body, .viewfinder, .thumb, .under) {
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .step-fwd-enter-active,
  .step-fwd-leave-active,
  .step-back-enter-active,
  .step-back-leave-active,
  .step-fwd-enter-active *,
  .step-back-enter-active * {
    transition: none !important;
  }
}
</style>
