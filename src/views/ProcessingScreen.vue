<script setup>
import { computed, inject, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import AppButton from '@/components/AppButton.vue'
import MarkLayer from '@/components/MarkLayer.vue'
import StepList from '@/components/StepList.vue'
import StepNumber from '@/components/StepNumber.vue'
import ZoomPanStage from '@/components/ZoomPanStage.vue'
import ZoomRail from '@/components/ZoomRail.vue'
import { t } from '@/i18n'
import { STEPS as STRIP_STEPS } from '@/lib/steps'
import { confirmRedo } from '@/lib/use-steps'
import { useSessionStore } from '@/stores/session'
import { useStripStore } from '@/stores/strip'

/* Processing — the scan, made watchable.
 *
 * Every buffer shown here is a real pipeline buffer. The light/dark view is the
 * photograph with its paper estimated and subtracted; the dark specks are the
 * actual binary mask the cutoff produced; the boxes and marks are drawn from
 * the actual detections. Nothing here is a CSS filter standing in for a step
 * that did not run.
 *
 * The one presentational liberty, stated plainly because it is the kind of
 * thing that becomes a lie if left unsaid: the scan finishes in roughly 50–250ms
 * and each step is HELD for a readable beat afterwards. The work is real and
 * already done; the pacing exists so a person can watch it. Nothing is
 * animated that did not happen, and no step is shown before the buffer behind
 * it exists.
 *
 * THEN IT STOPS (Oct 2026). The run plays the four pictures and stays on the
 * marks: the pictures become buttons, the photograph itself is a fifth to
 * compare against, pressing and holding any picture shows the photograph under
 * it, and the yellow bar moves on when the person is ready. The title then says
 * what the screen is showing — how the marks were found — not that it is
 * measuring.
 *
 * LOOKING BACK (`?look=1`). Reopened from the step list, the screen does not
 * scan: it runs the pipeline once more with the settings in hand for its
 * pictures alone (strip.inspect), leaves every mark and fix as it was, and
 * opens settled, with the bar going back to where the person was.
 */

const route = useRoute()
const router = useRouter()
const wide = inject('wideLayout', ref(false))
const session = useSessionStore()
const strip = useStripStore()

/* Long enough to register as a step, short enough that four of them do not
   become a wait. */
const STEP_HOLD_MS = 500

/* The photograph itself first, then the four pictures the pipeline makes. The
   run plays the four; the photograph is there to compare against once it has
   stopped (Oct 2026). */
const STEPS = [
  { key: 'photo', label: 'processing.stepPhoto', badge: 'processing.badgePhoto' },
  { key: 'lightDark', label: 'processing.stepLightDark', badge: 'processing.badgeLightDark' },
  { key: 'darkSpecks', label: 'processing.stepDarkSpecks', badge: 'processing.badgeDarkSpecks' },
  { key: 'boxes', label: 'processing.stepBoxes', badge: 'processing.badgeBoxes' },
  { key: 'marks', label: 'processing.stepMarks', badge: 'processing.badgeMarks' },
]
const MARKS = STEPS.length - 1

const stepIndex = ref(1)
/* Once the run has played (or straight away when looking back), the screen
   stays on the marks and waits: the pictures become buttons, the photograph
   can be held up against any of them, and the yellow bar moves on. */
const settled = ref(false)
/* Pressing and holding the picture shows the photograph underneath it. */
const peeking = ref(false)

let buffers = {}
let detections = []

const looking = computed(() => route.query.look === '1' && strip.marks.length > 0)

const progress = computed(() => (Math.max(0, stepIndex.value) / MARKS) * 100)
const currentBadge = computed(() => t(STEPS[peeking.value ? 0 : stepIndex.value].badge))

/* What the stage shows for a step. */
function picture(index) {
  const key = STEPS[index].key
  const photo = strip.working?.canvas ?? null
  if (key === 'lightDark' || key === 'darkSpecks') return { src: buffers[key] ?? photo, boxes: [], marks: [] }
  if (key === 'boxes') return { src: buffers.lightDark ?? photo, boxes: detections, marks: [] }
  if (key === 'marks') return { src: photo, boxes: [], marks: strip.marks, clumps: strip.clumps }
  return { src: photo, boxes: [], marks: [] }
}
const view = computed(() => picture(peeking.value ? 0 : stepIndex.value))

function show(index) {
  if (settled.value) stepIndex.value = index
}

/* Zoom and pan (Oct 2026): the pictures are the strip at full detail, and on a
   phone the whole strip is a band. One finger moves it, as on a map; the same
   view is kept from picture to picture, so a spot can be compared through all
   of them.

   Press and hold still shows the photograph — after a moment, and not if the
   finger goes on to move the picture. */
const stage = ref(null)
const zoom = computed(() => stage.value?.zoom ?? 1)
const PEEK_MS = 180
let peekTimer = null
function peek(on) {
  clearTimeout(peekTimer)
  if (!on) {
    peeking.value = false
    return
  }
  if (settled.value) peekTimer = setTimeout(() => (peeking.value = true), PEEK_MS)
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

/* Where the yellow bar goes: on to Manually refine after a run, and on to the
   furthest step already reached when looking back. Always forward, so always
   "Continue to …" — it was "Back to …" while looking back, which read as going
   backwards when it was not (Oct 2026). */
const next = computed(() => {
  const check = STRIP_STEPS.find((s) => s.key === 'check')
  if (!looking.value) return check
  return STRIP_STEPS.find((s) => s.key === strip.furthest && ['check', 'count'].includes(s.key)) ?? check
})

/* THE SLIDERS (moved here from the Refine screen, Oct 2026): how dark a speck
   must be, and how big. Each change runs the pipeline again with its pictures,
   so the four pictures stay true to the settings, and the stage shows the
   marks while they move. Still no machine total anywhere on this screen —
   a visible number would let someone tune until it matched what they
   expected (non-negotiable 1). */
const initial = { ...strip.params }
const contrastFloor = ref(strip.params.contrastFloor)
const minArea = ref(strip.params.minArea)
const busy = ref(false)
const ghosts = ref([])
let interacting = false
let debounce = null

/* Ranges are centred on what calibration produced, so the middle of each track
   is the measured answer and the ends are the plausible extremes around it. */
const contrastRange = computed(() => ({
  min: Math.max(4, Math.round(initial.contrastFloor * 0.35)),
  max: Math.min(220, Math.round(initial.contrastFloor * 1.9)),
}))
const areaRange = computed(() => ({
  min: 2,
  max: Math.max(12, Math.round(initial.medianEggArea * 1.6)),
}))
/* Where the calibration egg sits on the speck-size track; past it, eggs that
   size would be dropped. The tick follows the thumb's centre, which stops half
   its 28px width from either end. */
const calibrationTick = computed(() => {
  const { min, max } = areaRange.value
  return Math.min(1, Math.max(0, (initial.medianEggArea - min) / Math.max(1, max - min)))
})
const THUMB = 28
const tickOffset = computed(() => `calc(${THUMB / 2}px + (100% - ${THUMB}px) * ${calibrationTick.value})`)
const tickCaption = computed(() =>
  strip.calibrationSource === 'probe' ? t('refine.tickCaptionAuto') : t('refine.tickCaption'),
)

async function onSlide() {
  /* After fixes by hand, a slider finds the marks again — ask first; declined,
     the slider goes back. */
  if (strip.judgments) {
    const wanted = { contrastFloor: contrastFloor.value, minArea: minArea.value }
    contrastFloor.value = strip.params.contrastFloor
    minArea.value = strip.params.minArea
    if (!(await confirmRedo('redo'))) return
    contrastFloor.value = wanted.contrastFloor
    minArea.value = wanted.minArea
  }
  if (!interacting) {
    ghosts.value = strip.marks.slice()
    interacting = true
  }
  stepIndex.value = MARKS
  clearTimeout(debounce)
  debounce = setTimeout(rerun, 70)
}

async function rerun() {
  if (busy.value) return
  busy.value = true
  try {
    const fresh = {}
    const result = await strip.scan({
      params: { ...strip.params, contrastFloor: contrastFloor.value, minArea: minArea.value },
      wantStages: true,
      onStage: (stage, bitmap) => {
        fresh[stage] = bitmap
      },
    })
    buffers = fresh
    detections = result.detections
    stepIndex.value = MARKS
  } finally {
    busy.value = false
  }
}

/* Marks lost since the sliders started moving, drawn faint where nothing is
   marked now. */
const lostGhosts = computed(() => {
  if (!ghosts.value.length) return []
  const CELL = 0.01
  const occupied = new Set(strip.marks.map((m) => `${Math.round(m.x / CELL)}:${Math.round(m.y / CELL)}`))
  return ghosts.value.filter((g) => !occupied.has(`${Math.round(g.x / CELL)}:${Math.round(g.y / CELL)}`))
})

async function backToStart() {
  if (!(await confirmRedo('redo'))) return
  contrastFloor.value = initial.contrastFloor
  minArea.value = initial.minArea
  ghosts.value = []
  interacting = false
  rerun()
}

/* The correction: mark an egg by hand and measure again from it. */
async function markAnEgg() {
  if (!(await confirmRedo('redo'))) return
  router.push({ name: 'calibrate' })
}
function goOn() {
  router.replace({ name: next.value.route })
}

onMounted(async () => {
  if (!strip.working) {
    router.replace({ name: 'welcome' })
    return
  }

  if (looking.value) {
    const seen = await strip.inspect()
    buffers = seen.buffers
    detections = seen.detections
    stepIndex.value = MARKS
    settled.value = true
    return
  }

  const result = await strip.scan({
    wantStages: true,
    onStage: (stage, bitmap) => {
      buffers[stage] = bitmap
    },
  })
  detections = result.detections

  // The real intermediate buffers, in the order the pipeline made them, then
  // what it boxed, then the marks over the photograph.
  for (let i = 1; i <= MARKS; i++) {
    stepIndex.value = i
    if (i < MARKS) await wait(STEP_HOLD_MS)
  }
  settled.value = true
})
</script>

<template>
  <div class="processing">
    <!-- Laptop: the finished steps, collapsed, above this one (StepList). -->
    <StepList v-if="wide" class="steps-before" part="before" />

    <header class="head" data-step="measure">
      <div class="title-row">
        <StepNumber />
        <h1 class="title t-display">{{ t(settled ? 'processing.lookTitle' : 'processing.title') }}</h1>
      </div>
      <p v-if="settled" class="look-hint t-body">{{ t('processing.lookHint') }}</p>
      <div v-else class="track">
        <span class="fill" :style="{ width: `${progress}%` }" />
      </div>
    </header>

    <div
      class="stage-wrap"
      @pointerdown="peek(true)"
      @pointerup="peek(false)"
      @pointerleave="peek(false)"
      @pointercancel="peek(false)"
    >
      <ZoomPanStage
        ref="stage"
        :src="view.src"
        tool="pan"
        background="var(--ink)"
        @navigate="peek(false)"
        v-slot="{ rect, stage: size }"
      >
        <MarkLayer
          :marks="view.marks"
          :clumps="view.clumps ?? []"
          :ghosts="view.marks.length ? lostGhosts : []"
          :boxes="view.boxes"
          :rect="rect"
          :stage="size"
        />
      </ZoomPanStage>
      <ZoomRail class="stage-rail" :zoom="zoom" :show-level="wide" @zoom="(f) => stage?.zoomBy(f)" />
      <p v-if="lostGhosts.length && view.marks.length" class="ghost-caption t-label">
        {{ t('refine.ghostCaption') }}
      </p>
      <span class="buffer-badge t-label">{{ currentBadge }}</span>
    </div>

    <div class="rail">
      <!-- Buttons from the start, disabled while the run plays. Not a dynamic
           <component :is>: its children are compiled as a slot Vue treats as
           stable, and the ◀ stayed on Marks after another picture was chosen. -->
      <button
        v-for="(step, i) in STEPS"
        :key="step.key"
        class="rail-step"
        :class="{ current: i === stepIndex, pickable: settled }"
        type="button"
        :disabled="!settled"
        @click="show(i)"
      >
        <div class="thumb">
          <span v-if="step.key === 'photo'" class="mini-photo"><i /><i /><i /></span>
          <span v-else-if="step.key === 'lightDark'" class="histogram">
            <i style="height: 30%" /><i style="height: 85%" /><i style="height: 60%" /><i style="height: 15%" />
          </span>
          <span v-else-if="step.key === 'boxes'" class="mini-box" />
          <span v-else-if="step.key === 'marks'" class="mini-ring" />
        </div>
        <div class="rail-label t-label">
          {{ t(step.label) }}<span v-if="i === stepIndex" aria-hidden="true"> ◀</span>
        </div>
      </button>
    </div>

    <div v-if="settled" class="controls">
      <div class="control">
        <label class="label t-title" for="split">{{ t('refine.lightDarkSplit') }}</label>
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
        <label class="label t-title" for="speck">{{ t('refine.speckSize') }}</label>
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
        <p class="hint t-body">{{ tickCaption }}</p>
      </div>
      <div class="links">
        <AppButton variant="quiet" @click="markAnEgg">{{ t('refine.markAnEgg') }}</AppButton>
        <AppButton variant="quiet" @click="backToStart">{{ t('refine.backToStart') }}</AppButton>
      </div>
    </div>

    <div v-if="settled" class="footer">
      <AppButton variant="primary" bar @click="goOn">
        {{ t('steps.continueTo', { step: t(`steps.${next.key}`) }) }}
      </AppButton>
    </div>

    <!-- Laptop: the steps still to come, below this one's actions. -->
    <StepList v-if="wide" class="steps-after" part="after" />
  </div>
</template>

<style scoped>
.processing {
  height: 100%;
  background: var(--ink);
  display: flex;
  flex-direction: column;
}

.head {
  flex: none;
  padding: var(--sp-16);
}
.title-row {
  display: flex;
  align-items: flex-start;
  gap: var(--sp-12);
}
.title {
  flex: 1;
  margin: 0;
  color: var(--paper);
}
.track {
  margin-top: var(--sp-12);
  height: 10px;
  border: var(--bd-inner) solid var(--paper);
}
.fill {
  display: block;
  height: 100%;
  background: var(--paper);
  /* 0.12s, driven by real step completion — never a timer pretending to be one. */
  transition: width 0.12s linear;
}

.stage-wrap {
  flex: 1;
  position: relative;
  min-height: 0;
  cursor: grab;
}
.stage-rail {
  position: absolute;
  right: 0;
  bottom: 0;
}
.buffer-badge {
  position: absolute;
  right: var(--sp-12);
  top: var(--sp-12);
  background: var(--ink);
  color: var(--paper);
  border: var(--bd-fine) solid var(--paper);
  padding: 4px 8px;
}

.rail {
  flex: none;
  display: flex;
  gap: 6px;
  padding: var(--sp-14) var(--sp-16) 18px;
}
.rail-step {
  flex: 1;
  color: inherit;
  cursor: default;
  min-width: 0;
  text-align: center;
}
.thumb {
  height: 52px;
  border: var(--bd-inner) solid var(--rule-idle);
  border-radius: var(--r-small);
  background: var(--stage-bg);
  display: flex;
  align-items: center;
  justify-content: center;
}
/* The step running now is marked in --action — "you / here / go" — which is
   the one thing yellow means besides the primary bar. */
.current .thumb {
  border: var(--bd) solid var(--action);
}
.rail-label {
  margin-top: var(--sp-5);
  color: var(--disabled);
  overflow-wrap: anywhere;
}
.current .rail-label {
  color: var(--action);
}

.rail-step.pickable {
  min-height: var(--hit-min);
  cursor: pointer;
}
.look-hint {
  margin: var(--sp-8) 0 0;
  color: var(--paper);
}
.footer {
  flex: none;
}

/* The sliders, on paper below the pictures: an 8px ink-outlined track and a
   28px square thumb in a 44px touch band, the pink calibration tick on the
   speck-size track. */
.controls {
  flex: none;
  padding: var(--sp-14) var(--sp-16);
  background: var(--paper);
  color: var(--ink);
  display: flex;
  flex-direction: column;
  gap: var(--sp-12);
}
.label {
  display: block;
  margin-bottom: var(--sp-10);
}
.hint {
  margin: var(--sp-10) 0 0;
  color: var(--muted);
}
.links {
  display: flex;
  flex-wrap: wrap;
  gap: 0 var(--sp-16);
}
.track {
  position: relative;
  height: 8px;
  border: var(--bd-inner) solid var(--ink);
  background: var(--track-progress);
}
.tick {
  position: absolute;
  top: -8px;
  margin-left: -2px;
  width: 4px;
  height: 20px;
  background: var(--pink);
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
  width: 28px;
  height: 28px;
  margin-top: calc((var(--hit-min) - 28px) / 2);
  border-radius: 0;
  background: var(--ink);
  border: 0;
  cursor: pointer;
}
.slider::-moz-range-track {
  height: var(--hit-min);
  background: transparent;
}
.slider::-moz-range-thumb {
  width: 28px;
  height: 28px;
  border-radius: 0;
  background: var(--ink);
  border: 0;
  cursor: pointer;
}
.ghost-caption {
  position: absolute;
  left: var(--sp-12);
  bottom: var(--sp-12);
  margin: 0;
  padding: 4px 8px;
  background: var(--paper);
  color: var(--ink);
  border: var(--bd-fine) solid var(--ink);
}

.histogram {
  width: 100%;
  height: 100%;
  padding: 6px;
  display: flex;
  align-items: flex-end;
  gap: 2px;
  background: var(--panel);
}
.histogram i {
  flex: 1;
  background: var(--muted);
}
.mini-photo {
  width: 100%;
  height: 100%;
  padding: 8px;
  display: flex;
  align-items: center;
  justify-content: space-around;
  background: var(--panel);
}
.mini-photo i {
  width: 8px;
  height: 3px;
  background: var(--ink);
  transform: rotate(30deg);
}
.mini-box {
  width: 16px;
  height: 10px;
  border: var(--bd-fine) solid var(--cyan);
}
.mini-ring {
  width: 13px;
  height: 13px;
  border: 2.5px dashed var(--blue);
  border-radius: 50%;
}

/* Laptop (brief §5): title, progress and the step rail on the left; the
   buffer on the right at full height. */
.wide .processing {
  display: grid;
  grid-template-columns: minmax(var(--device-w), var(--pane-share)) 1fr;
  grid-template-rows: auto auto 1fr auto auto auto auto;
}
.wide .processing > .head { grid-column: 1; grid-row: 2; }
.wide .processing > .rail { grid-column: 1; grid-row: 4; }
.wide .processing > .controls { grid-column: 1; grid-row: 5; }
.wide .processing > .footer { grid-column: 1; grid-row: 6; }
.wide .processing > .stage-wrap {
  grid-column: 2;
  grid-row: 1 / -1;
  border-left: var(--bd) solid var(--paper);
}
/* The stage runs the full height of the column, which can be taller than the
   window; the zoom buttons go top-left, opposite the picture's name, where
   they are always in view. */
.wide .processing .stage-rail {
  top: 0;
  left: 0;
  right: auto;
  bottom: auto;
}
.wide .processing > .steps-before { grid-column: 1; grid-row: 1; }
.wide .processing > .steps-after { grid-column: 1; grid-row: -2; }
</style>
