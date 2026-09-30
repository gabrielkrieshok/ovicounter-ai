<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import AppButton from '@/components/AppButton.vue'
import ImageStage from '@/components/ImageStage.vue'
import MarkLayer from '@/components/MarkLayer.vue'
import StripHeader from '@/components/StripHeader.vue'
import { t } from '@/i18n'
import { useSessionStore } from '@/stores/session'
import { useStripStore } from '@/stores/strip'

/* Refine — two sliders, and no total anywhere.
 *
 * THE hard rule of this screen (settled decision §5.2): no machine total is
 * visible while a machine parameter is adjustable. An operator who can watch
 * the count while tuning will stop when the number matches what they expected,
 * which turns the tool into a machine for confirming priors. They tune against
 * the overlay — whether the marks land on eggs — and see totals only after.
 *
 * That leaves the screen owing them some feedback, which is §6.6, the one open
 * question carried forward from the previous brief. Two non-numeric answers are
 * implemented here:
 *
 *   Ghosts. Marks that existed when the operator started moving a slider and
 *   have since been lost render at 35% opacity. It shows what a movement COST
 *   without ever totalling what remains.
 *
 *   The pink tick. On the speck-size track, at the size of the egg they marked.
 *   Sliding past it means their own egg would no longer be found — a limit
 *   expressed in the units of their own judgment rather than in a count.
 */

const router = useRouter()
const session = useSessionStore()
const strip = useStripStore()

const showOriginal = ref(false)
const ghosts = ref([])
const busy = ref(false)

/* The values the strip arrived with, so "Back to start" means something. */
const initial = { ...strip.params }

const contrastFloor = ref(strip.params.contrastFloor)
const minArea = ref(strip.params.minArea)

/* Ranges are centred on what calibration produced, so the middle of each track
   is the measured answer and the ends are the plausible extremes around it —
   rather than a fixed 0–255 scale on which every real value sits in a sliver. */
const contrastRange = computed(() => ({
  min: Math.max(4, Math.round(initial.contrastFloor * 0.35)),
  max: Math.min(220, Math.round(initial.contrastFloor * 1.9)),
}))
const areaRange = computed(() => ({
  min: 2,
  max: Math.max(12, Math.round(initial.medianEggArea * 1.6)),
}))

/* Where the calibration egg sits on the speck-size track. Past this point the
   operator's own egg would be dropped. */
const calibrationTick = computed(() => {
  const { min, max } = areaRange.value
  const at = initial.medianEggArea
  return Math.min(1, Math.max(0, (at - min) / Math.max(1, max - min)))
})

/* The thumb's centre never reaches the ends of the track — it stops half its
   own width in. The tick has to follow the thumb, not the track, or it marks
   the wrong size at both extremes. */
const THUMB = 24
const tickOffset = computed(
  () => `calc(${THUMB / 2}px + (100% - ${THUMB}px) * ${calibrationTick.value})`,
)

let debounce = null
let interacting = false

/**
 * Every slider change re-runs the pipeline. Debounced to ~70ms, which is inside
 * the measured 13–38ms run time, so the overlay keeps up with the thumb.
 */
function onSlide() {
  if (!interacting) {
    // The state to measure the movement against, captured once per gesture.
    ghosts.value = strip.marks.slice()
    interacting = true
  }
  clearTimeout(debounce)
  debounce = setTimeout(rerun, 70)
}

async function rerun() {
  if (busy.value) return
  busy.value = true
  try {
    await strip.scan({
      params: {
        ...strip.params,
        contrastFloor: contrastFloor.value,
        minArea: minArea.value,
      },
    })
  } finally {
    busy.value = false
  }
}

/* A ghost is only interesting where nothing lives now. Anything still marked is
   not a loss, and drawing it faint underneath a live mark just thickens it. */
const lostGhosts = computed(() => {
  if (!ghosts.value.length) return []
  const live = strip.marks
  const CELL = 0.01
  const occupied = new Set(
    live.map((m) => `${Math.round(m.x / CELL)}:${Math.round(m.y / CELL)}`),
  )
  return ghosts.value.filter(
    (g) => !occupied.has(`${Math.round(g.x / CELL)}:${Math.round(g.y / CELL)}`),
  )
})

function backToStart() {
  contrastFloor.value = initial.contrastFloor
  minArea.value = initial.minArea
  ghosts.value = []
  interacting = false
  rerun()
}

function done() {
  router.push({ name: 'fixes' })
}

/* The correction. Calibration is measured by the probe on Crop; when the
   marks it produced look wrong, the operator marks an egg by hand and the
   strip is scanned again from that. */
function markAnEgg() {
  router.push({ name: 'calibrate' })
}

/* The pink tick marks the calibration egg's size. The ratified caption calls
   it "the egg you marked", which is only true when someone did — when the
   probe measured it, the caption says what was actually measured. */
const tickCaption = computed(() =>
  strip.calibrationSource === 'probe' ? t('refine.tickCaptionAuto') : t('refine.tickCaption'),
)

onMounted(() => {
  if (!strip.working) router.replace({ name: 'welcome' })
})
</script>

<template>
  <div class="refine">
    <StripHeader class="head" :title="t('refine.title')">
      <template #aside>
        <button
          class="toggle t-label"
          :class="{ on: showOriginal }"
          type="button"
          :aria-pressed="showOriginal"
          @click="showOriginal = !showOriginal"
        >
          {{ t('refine.photoToggle') }}
        </button>
      </template>
    </StripHeader>

    <!-- The whole strip, at every width (Sep 30, 2026). The hi-fi draws cover in
         the phone frame, but a strip is far wider than it is tall and cover
         showed about a third of it — the operator tuned against marks on part
         of the strip without seeing the rest. -->
    <div class="stage-wrap">
      <ImageStage
        :src="strip.working?.canvas ?? null"
        fit="contain"
        background="var(--stage-bg)"
        v-slot="{ rect, stage }"
      >
        <MarkLayer
          v-if="!showOriginal"
          :marks="strip.marks"
          :ghosts="lostGhosts"
          :rect="rect"
          :stage="stage"
        />
      </ImageStage>

      <p v-if="lostGhosts.length && !showOriginal" class="ghost-caption">
        {{ t('refine.ghostCaption') }}
      </p>
    </div>

    <div class="controls">
      <div class="control">
        <label class="label" for="split">{{ t('refine.lightDarkSplit') }}</label>
        <div class="track">
          <input
            id="split"
            v-model.number="contrastFloor"
            class="slider"
            type="range"
            :min="contrastRange.min"
            :max="contrastRange.max"
            @input="onSlide"
          />
        </div>
      </div>

      <div class="control">
        <label class="label" for="speck">{{ t('refine.speckSize') }}</label>
        <div class="track">
          <input
            id="speck"
            v-model.number="minArea"
            class="slider"
            type="range"
            :min="areaRange.min"
            :max="areaRange.max"
            @input="onSlide"
          />
          <span class="tick" :style="{ left: tickOffset }" />
        </div>
        <p class="hint">{{ tickCaption }}</p>
      </div>

      <AppButton variant="quiet" @click="markAnEgg">
        {{ t('refine.markAnEgg') }}
      </AppButton>

      <div class="footer">
        <AppButton variant="secondary" class="grow-1" @click="backToStart">
          {{ t('refine.backToStart') }}
        </AppButton>
        <AppButton variant="primary" class="grow-13" @click="done">
          {{ t('refine.marksLookRight') }}
        </AppButton>
      </div>
    </div>
  </div>
</template>

<style scoped>
.refine {
  height: 100%;
  background: var(--paper);
  display: flex;
  flex-direction: column;
}

/* 44px, up from the handoff's 34 — every tap target is at least 44. Filled
   while the marks are hidden, so the state is not colour alone. */
.toggle {
  min-height: var(--hit-min);
  padding: 0 var(--sp-10);
  display: flex;
  align-items: center;
  border: var(--bd) solid var(--ink);
  border-radius: var(--r-badge);
  background: var(--paper);
  color: var(--ink);
}
.toggle.on {
  background: var(--ink);
  color: var(--paper);
}

.stage-wrap {
  flex: 1;
  position: relative;
  min-height: 0;
}
.ghost-caption {
  position: absolute;
  left: var(--sp-14);
  bottom: var(--sp-14);
  margin: 0;
  background: var(--paper);
  border: var(--bd-fine) solid var(--ink);
  border-radius: var(--r-badge);
  padding: 6px var(--sp-10);
  font: 500 12px var(--font-sans);
  color: var(--ink);
}

.controls {
  border-top: var(--bd) solid var(--ink);
  padding: var(--sp-16) 20px;
  display: flex;
  flex-direction: column;
  gap: var(--sp-16);
}
.label {
  display: block;
  margin-bottom: var(--sp-8);
  font: 600 14px var(--font-sans);
}
.hint {
  margin: 6px 0 0;
  font: 400 12px var(--font-sans);
  color: var(--muted);
}

/* 8px track, 24px ink thumb — the handoff's geometry, which no stock range
   input provides.

   The track is a real element and the input is a transparent 44px band laid
   over it. Painting the track on the input itself does not survive this app's
   `box-sizing: border-box` reset: the padding needed to reach a 44px target
   eats an 8px height down to nothing, and the track silently disappears. */
.track {
  position: relative;
  height: 8px;
  border-radius: 4px;
  background: var(--track-progress);
}
.tick {
  position: absolute;
  top: -4px;
  margin-left: -1.5px;
  width: 3px;
  height: 16px;
  background: var(--pink);
  border-radius: 2px;
  pointer-events: none;
}

.slider {
  -webkit-appearance: none;
  appearance: none;
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 100%;
  height: var(--hit-min);
  margin: 0;
  padding: 0;
  background: transparent;
  touch-action: none;
}
.slider::-webkit-slider-runnable-track {
  height: var(--hit-min);
  background: transparent;
}
.slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 24px;
  height: 24px;
  margin-top: calc((var(--hit-min) - 24px) / 2);
  border-radius: 50%;
  background: var(--ink);
  border: 0;
  cursor: pointer;
}
.slider::-moz-range-track {
  height: var(--hit-min);
  background: transparent;
}
.slider::-moz-range-thumb {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--ink);
  border: 0;
  cursor: pointer;
}


.footer {
  display: flex;
  gap: var(--sp-10);
}
.grow-1 { flex: 1; }
.grow-13 { flex: 1.3; }

/* Laptop: stage left at full height, header and controls in the right pane. */
.wide .refine {
  display: grid;
  grid-template-columns: 1fr minmax(var(--device-w), var(--pane-share));
  grid-template-rows: auto 1fr;
}
.wide .refine > .head {
  grid-column: 2;
  grid-row: 1;
}
.wide .refine > .stage-wrap {
  grid-column: 1;
  grid-row: 1 / -1;
  border-right: var(--bd) solid var(--ink);
}
.wide .refine > .controls {
  grid-column: 2;
  grid-row: 2;
  border-top: 0;
}
.wide .refine .footer {
  margin-top: auto;
}
</style>
