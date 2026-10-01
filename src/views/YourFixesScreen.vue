<script setup>
import { computed, inject, nextTick, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'

import AppButton from '@/components/AppButton.vue'
import CoverageBar from '@/components/CoverageBar.vue'
import JudgmentTally from '@/components/JudgmentTally.vue'
import MagnifierLoupe from '@/components/MagnifierLoupe.vue'
import MarkLayer from '@/components/MarkLayer.vue'
import Overview from '@/components/Overview.vue'
import StripHeader from '@/components/StripHeader.vue'
import ToolPicker from '@/components/ToolPicker.vue'
import ZoomPanStage from '@/components/ZoomPanStage.vue'
import ZoomRail from '@/components/ZoomRail.vue'
import StepList from '@/components/StepList.vue'
import { t, weekday } from '@/i18n'
import { clumpCounts } from '@/lib/marks'
import { useSessionStore } from '@/stores/session'
import { useStripStore } from '@/stores/strip'

/* Your fixes — where the count stops being the machine's and becomes the
 * operator's.
 *
 * Every ✕ and every + here is recorded as a human judgment, and the record —
 * the photograph, the settings, and these positions — is the product. The count
 * is only a projection of it.
 *
 * Rejecting has to be the cheapest gesture on the screen (§6.3), so Remove is
 * the tool chosen on arrival and one finger paints with it; navigating needs a
 * second finger. Clumps have a pass of their own: one at a time, zoomed in,
 * the person gives the number. See ZoomPanStage for why the one-finger
 * gesture belongs to culling rather than to panning.
 */

const router = useRouter()
const session = useSessionStore()
const strip = useStripStore()
const stage = ref(null)
const wide = inject('wideLayout', ref(false))

/* What the stage shows, read back from it — the Overview's box, the coverage
   bar's outline, and what coverage is measured against. */
const zoom = computed(() => stage.value?.zoom ?? 1)
const viewport = computed(() => stage.value?.viewport ?? { x0: 0, y0: 0, x1: 1, y1: 1 })
watch([viewport, zoom], () => strip.noteLooked(viewport.value, zoom.value))

/* "Strip 2 · Wednesday" above the title on the laptop; nothing on a quick
   count, which is not strip anything of anything. */
const eyebrow = computed(() => {
  if (!session.isActive || session.isQuick) return ''
  return [t('capture.strip', { n: session.stripNumber }), weekday(session.startedAt)].join(' · ')
})

/* Human judgments only (non-negotiable 1). Undo moved up beside the tools
   (Oct 2026), so the tally has room for splits on the phone too. */
const tally = computed(() => [
  { kind: 'removed', n: strip.removedCount },
  { kind: 'added', n: strip.addedCount },
  { kind: 'split', n: strip.splitCount },
])

onMounted(() => {
  if (!strip.working) {
    router.replace({ name: 'welcome' })
    return
  }
  /* Marks stay dashed blue — found by the app — until the part they sit in
     has been looked at close up; then they turn green. Parts looked at before
     a trip to Refine still count. See stores/strip.js `applyLooked`. */
  strip.applyLooked()
})

/* The tool one finger uses (Oct 2026). Remove first: culling is the job. */
const tool = ref('remove')

/* The brush: a fingertip on screen, whatever the zoom — zoom in to be finer,
   out to sweep wider. A mark is painted when its centre falls under it. */
const BRUSH_R = 22
let lastPaint = null

function marksUnder(point) {
  const r = stage.value?.rect
  if (!r) return []
  const hit = []
  for (const m of strip.marks) {
    const dx = r.left + m.x * r.width - point.x
    const dy = r.top + m.y * r.height - point.y
    if (dx * dx + dy * dy <= BRUSH_R * BRUSH_R) hit.push(m.id)
  }
  return hit
}

function onPaintStart() {
  strip.beginStroke()
  lastPaint = null
}

/* Sampled along the finger's path, not only where it was reported, so a fast
   sweep does not skip the marks between two samples. */
function onPaint(point) {
  const from = lastPaint ?? point
  const steps = Math.max(1, Math.ceil(Math.hypot(point.x - from.x, point.y - from.y) / (BRUSH_R / 2)))
  const ids = new Set()
  for (let i = 1; i <= steps; i++) {
    const p = { x: from.x + ((point.x - from.x) * i) / steps, y: from.y + ((point.y - from.y) * i) / steps }
    for (const id of marksUnder(p)) ids.add(id)
  }
  if (!lastPaint) for (const id of marksUnder(point)) ids.add(id)
  lastPaint = point
  strip.paint([...ids], tool.value)
}

function onPaintEnd() {
  strip.endStroke()
  lastPaint = null
}

/* THE CLUMPS (Oct 2026). Touching eggs are where the app guesses most, so
   they get their own pass: one clump at a time, zoomed in, with the app's
   number and what the clump's size suggests, and the person's own number set
   with − and +. Next accepts what is shown. One finger pans while this is
   open, so looking around a clump never removes anything. */
const clumpMode = ref(false)
const clumpIndex = ref(0)
/* Most doubtful first: where the watershed and the clump's size disagree
   most, the app's number is least to be trusted. Ties go to the bigger clump,
   which moves the count more. The order uses only the app's two counts, so it
   stays put while the person changes numbers. */
const doubt = (c) => Math.abs(c.byArea - c.watershed)
const queue = computed(() =>
  [...strip.clumps].sort((a, b) => doubt(b) - doubt(a) || b.area - a.area),
)
const current = computed(() => (clumpMode.value ? queue.value[clumpIndex.value] : null))
const counts = computed(() => clumpCounts(strip.marks))
const currentCount = computed(() => (current.value ? counts.value.get(current.value.id) ?? 0 : 0))
const clumpsChecked = computed(() => strip.clumps.filter((c) => c.checked).length)

/* After the layout settles: on a phone, opening the pass hides the band and
   the tally, and the stage grows to take their place. */
async function focusClump() {
  await nextTick()
  requestAnimationFrame(() => {
    const c = current.value
    if (!c) return
    stage.value?.focusOn({ x0: c.x, y0: c.y, x1: c.x + c.w, y1: c.y + c.h }, 0.4)
  })
}
function openClumps() {
  const first = queue.value.findIndex((c) => !c.checked)
  clumpIndex.value = first >= 0 ? first : 0
  clumpMode.value = true
  focusClump()
}
function closeClumps() {
  clumpMode.value = false
}
function setClump(n) {
  if (current.value && n >= 0) strip.setClumpCount(current.value.id, n)
}
function stepClump(by) {
  if (by > 0 && current.value) strip.confirmClump(current.value.id)
  const next = clumpIndex.value + by
  if (next >= queue.value.length) {
    closeClumps()
    return
  }
  clumpIndex.value = Math.max(0, next)
  focusClump()
}

/* The minimap: centre the view where it was touched. */
function moveTo(point) {
  stage.value?.centerOn(point.x, point.y)
}

/* A fix changes the marks it touches and nothing else (Gabriel, Oct 2026):
   nothing here finds marks again or adjusts how they are found. After a run
   of fixes the page says that Measure might fit the strip better — the
   person's call, made on Measure's own sliders. */
const NUDGE_AT = 5
const fixes = computed(() => strip.removedCount + strip.addedCount + strip.splitCount)
const nudgeDismissed = ref(false)
const nudge = computed(() => !nudgeDismissed.value && fixes.value >= NUDGE_AT)

function onAdd(point) {
  if (!point) return
  const inside = point.x >= 0 && point.x <= 1 && point.y >= 0 && point.y <= 1
  if (inside) strip.addMark(point)
}

async function onStroke(points) {
  const usable = points.filter(Boolean)
  if (usable.length > 1) await strip.splitAlong(usable)
}

/* Back to Measure's pictures and sliders, to change how the marks are found. */
function adjust() {
  router.push({ name: 'processing', query: { look: '1' } })
}

function done() {
  /* If nothing was touched, the proposals go back to being proposals and the
     result says so. See stores/strip.js `finishReview`. */
  strip.finishReview()
  router.push({ name: 'result' })
}
</script>

<template>
  <div class="fixes" :class="{ zoomed: zoom > 1.001, clumping: clumpMode && !wide }">
    <!-- Laptop: the finished steps, collapsed, above this one (StepList). -->
    <StepList v-if="wide" class="steps-before" part="before" />

    <StripHeader class="head" :title="t('fixes.title')" :eyebrow="wide ? eyebrow : ''">
      <!-- The clump pass: one clump at a time, the person's number. -->
      <div v-if="current" class="clump-panel">
        <div class="clump-head">
          <span class="t-label">{{ t('fixes.clumpOf', { n: clumpIndex + 1, total: queue.length }) }}</span>
          <button class="clump-exit t-label" type="button" @click="closeClumps">{{ t('fixes.clumpsDone') }}</button>
        </div>
        <div class="clump-row">
        <div class="stepper">
          <button
            class="step t-title"
            type="button"
            :aria-label="t('fixes.clumpFewer')"
            :disabled="currentCount <= 0"
            @click="setClump(currentCount - 1)"
          >−</button>
          <span class="clump-count t-tally" :class="{ machine: !current.checked }" aria-live="polite">
            {{ current.checked ? currentCount : `~${currentCount}` }}
          </span>
          <button class="step t-title" type="button" :aria-label="t('fixes.clumpMore')" @click="setClump(currentCount + 1)">+</button>
        </div>
        <AppButton variant="secondary" class="clump-next" @click="stepClump(1)">
          {{ t(clumpIndex + 1 >= queue.length ? 'fixes.clumpLast' : 'fixes.clumpNext') }}
        </AppButton>
        </div>
        <p class="clump-note t-body">{{ t('fixes.clumpHint', { app: current.watershed, size: current.byArea }) }}</p>
        <AppButton variant="quiet" class="clump-prev" :disabled="clumpIndex === 0" @click="stepClump(-1)">{{ t('fixes.clumpPrev') }}</AppButton>
      </div>

      <template v-else>
        <!-- Pick what one finger does; the line under says how, and that two
             fingers move the strip. -->
        <ToolPicker v-model="tool" :can-undo="!!strip.history.length" @undo="strip.undo()" />
        <p class="tool-hint t-body">
          {{ t(`fixes.hint${tool.charAt(0).toUpperCase()}${tool.slice(1)}`) }}
          <span class="two-fingers">{{ t('fixes.twoFingers') }}</span>
        </p>
        <AppButton v-if="strip.clumps.length" variant="secondary" class="clumps-open" @click="openClumps">
          {{ t('fixes.clumpsOpen', { done: clumpsChecked, total: strip.clumps.length }) }}
        </AppButton>
      </template>
    </StripHeader>

    <!-- Phone: zoomed past 1, a band above the stage shows the whole strip with
         a box for where you are and the parts already looked at. At zoom 1 it
         collapses (Gabriel, Sep 30): the stage already shows the whole strip,
         and showing it twice costs the stage 132px. The stage keeps the photo
         still on screen as the band arrives (ZoomPanStage `measure`). -->
    <div v-if="!wide && zoom > 1.001 && !clumpMode" class="band">
      <Overview
        class="overview"
        :source="strip.working?.canvas ?? null"
        :marks="strip.marks"
        :viewport="viewport"
        :looked="strip.looked"
        @move="moveTo"
      />
      <CoverageBar tone="dark" :looked="strip.looked" />
    </div>

    <div class="stage-wrap">
      <ZoomPanStage
        ref="stage"
        :src="strip.working?.canvas ?? null"
        background="var(--stage-bg)"
        :tool="clumpMode ? 'pan' : tool"
        @paintstart="onPaintStart"
        @paint="onPaint"
        @paintend="onPaintEnd"
        @add="onAdd"
        @stroke="onStroke"
        @navigate="strip.noteReview()"
        v-slot="{ rect, stage: size, hold, stroke, brush }"
      >
        <MarkLayer :marks="strip.marks" :clumps="strip.clumps" :focus-clump="current?.id ?? null" :rect="rect" :stage="size" />

        <!-- The stroke, while it is being drawn. It is not a mark and never
             becomes one, so it is drawn as plain ink rather than in any of the
             mark-language colours. -->
        <svg v-if="stroke.length > 1" class="stroke" :width="size.width" :height="size.height">
          <polyline
            :points="stroke.map((p) => `${rect.left + p.x * rect.width},${rect.top + p.y * rect.height}`).join(' ')"
          />
        </svg>

        <!-- The brush, in the colour of what it does: a fingertip, whatever the
             zoom. -->
        <svg v-if="brush && (tool === 'remove' || tool === 'keep')" class="brush" :width="size.width" :height="size.height">
          <circle :cx="brush.x" :cy="brush.y" :r="BRUSH_R" class="brush-halo" />
          <circle :cx="brush.x" :cy="brush.y" :r="BRUSH_R" class="brush-ring" :class="tool" />
        </svg>

        <MagnifierLoupe
          v-if="hold"
          :source="strip.working?.canvas"
          :point="hold.image"
          :anchor="hold.stage"
          :stage="size"
        />
      </ZoomPanStage>
      <ZoomRail
        v-if="!wide"
        class="stage-rail"
        :zoom="zoom"
        :show-level="false"
        @zoom="(f) => stage?.zoomBy(f)"
      />
    </div>

    <!-- Laptop: under the photograph, how to move it, how much has been looked
         at and where the stage is, and what the marks mean. -->
    <div v-if="wide" class="under">
      <ZoomRail :zoom="zoom" @zoom="(f) => stage?.zoomBy(f)" />
      <Overview
        class="minimap"
        :source="strip.working?.canvas ?? null"
        :marks="strip.marks"
        :viewport="viewport"
        :looked="strip.looked"
        @move="moveTo"
      />
      <CoverageBar class="coverage" :looked="strip.looked" :viewport="viewport" />
    </div>

    <JudgmentTally class="tally" :cells="tally" />

    <div v-if="!clumpMode" class="adjust">
      <!-- After a run of fixes, the way to Measure says why it might help. -->
      <div v-if="nudge" class="nudge" role="status">
        <p class="t-body">{{ t('fixes.nudgeBody', { n: fixes }) }}</p>
        <div class="nudge-actions">
          <AppButton variant="secondary" @click="adjust">{{ t('fixes.nudgeGo') }}</AppButton>
          <AppButton variant="quiet" @click="nudgeDismissed = true">{{ t('fixes.nudgeDismiss') }}</AppButton>
        </div>
      </div>
      <AppButton v-else variant="quiet" @click="adjust">{{ t('fixes.adjust') }}</AppButton>
    </div>

    <div class="done-row">
      <AppButton class="done" variant="primary" bar @click="done">
        {{ t('fixes.done') }}
      </AppButton>
    </div>

    <!-- Laptop: the steps still to come, below this one's actions. -->
    <StepList v-if="wide" class="steps-after" part="after" />
  </div>
</template>

<style scoped>
.fixes {
  height: 100%;
  background: var(--paper);
  display: flex;
  flex-direction: column;
}

.clumps-open {
  margin-top: var(--sp-12);
}
.clump-panel {
  display: flex;
  flex-direction: column;
  gap: var(--sp-10);
  border: var(--bd) solid var(--ink);
  padding: var(--sp-12);
}
.clump-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sp-12);
}
.clump-exit {
  min-height: var(--hit-min);
  color: var(--ink);
  text-decoration: underline;
  text-underline-offset: 4px;
}
.stepper {
  display: flex;
  align-items: center;
  border: var(--bd) solid var(--ink);
}
.stepper .step {
  flex: none;
  width: var(--hit-secondary);
  height: var(--hit-secondary);
  font-size: 28px;
  color: var(--ink);
  background: var(--paper);
}
.stepper .step:first-child {
  border-right: var(--bd) solid var(--ink);
}
.stepper .step:last-child {
  border-left: var(--bd) solid var(--ink);
}
.stepper .step:disabled {
  color: var(--disabled);
}
.clump-count {
  flex: 1;
  text-align: center;
}
.clump-count.machine {
  color: var(--muted);
}
.clump-note {
  margin: 0;
  color: var(--muted);
}
/* The number and Next side by side, so the clump keeps the stage on a
   phone and Done stays on screen on a laptop. */
.clump-row {
  display: flex;
  gap: var(--sp-8);
}
.clump-row .stepper {
  flex: 1;
}
.clump-next {
  flex: 1;
  width: auto;
}
.clump-prev {
  align-self: flex-start;
}
/* Checking clumps on a phone: the stage takes the room the tally and the
   way to Measure had. */
.fixes.clumping .tally,
.fixes.clumping .adjust {
  display: none;
}
.tool-hint {
  margin: var(--sp-8) 0 0;
}
.two-fingers {
  color: var(--muted);
}

.brush {
  position: absolute;
  left: 0;
  top: 0;
  pointer-events: none;
}
.brush-halo {
  fill: none;
  stroke: var(--paper);
  stroke-opacity: 0.7;
  stroke-width: 4;
}
.brush-ring {
  fill: none;
  stroke-width: 2;
}
.brush-ring.remove { stroke: var(--red); }
.brush-ring.keep { stroke: var(--green); }

.band {
  flex: none;
  height: 156px;
  padding: var(--sp-10) var(--sp-16);
  background: var(--stage-bg);
  border-bottom: var(--bd) solid var(--ink);
  display: flex;
  flex-direction: column;
  gap: var(--sp-8);
}
.band .overview {
  flex: 1;
}

.stage-wrap {
  flex: 1;
  position: relative;
  min-height: 0;
}
/* Not `.rail` — that is ZoomRail's own root class, and a rule here by that
   name also pinned the laptop's rail over the mark key. */
.stage-rail {
  position: absolute;
  right: 0;
  bottom: 0;
}

.stroke {
  position: absolute;
  left: 0;
  top: 0;
  pointer-events: none;
}
.stroke polyline {
  fill: none;
  stroke: var(--ink);
  stroke-width: 2.5;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.tally {
  flex: none;
  border-bottom: 0;
}

.nudge {
  border: var(--bd) solid var(--ink);
  background: var(--action);
  padding: var(--sp-12);
  display: flex;
  flex-direction: column;
  gap: var(--sp-10);
}
.nudge p {
  margin: 0;
}
.nudge-actions {
  display: flex;
  align-items: center;
  gap: var(--sp-16);
}
.nudge-actions > :last-child {
  flex: none;
  white-space: nowrap;
}
.adjust {
  padding: 0 var(--sp-16);
}

.done-row {
  display: flex;
  flex: none;
}

/* Laptop (Field Manual brief §3, §5): the controls column on the left — the
   header with its bulleted gestures, the tally, the way to the sliders, and Undo
   and Done as one bar at the foot; the photograph on the right at contain, with
   the zoom rail, coverage and the mark key in a strip beneath it. */
.wide .fixes {
  display: grid;
  grid-template-columns: minmax(var(--device-w), var(--pane-share)) 1fr;
  grid-template-rows: auto auto auto 1fr auto auto auto;
}
.wide .fixes > .steps-before { grid-column: 1; grid-row: 1; }
.wide .fixes > .head { grid-column: 1; grid-row: 2; border-bottom: 0; }
.wide .fixes > .tally { grid-column: 1; grid-row: 3; border-bottom: var(--bd) solid var(--ink); }
.wide .fixes > .adjust { grid-column: 1; grid-row: 5; padding-bottom: var(--sp-8); }
.wide .fixes > .done-row { grid-column: 1; grid-row: 6; }
.wide .fixes > .steps-after { grid-column: 1; grid-row: 7; }
.wide .fixes > .stage-wrap {
  grid-column: 2;
  grid-row: 1 / 6;
  border-left: var(--bd) solid var(--ink);
}
.wide .fixes > .under {
  grid-column: 2;
  grid-row: 6 / -1;
  display: flex;
  align-items: center;
  gap: var(--sp-22);
  padding: var(--sp-12) var(--sp-16);
  border-left: var(--bd) solid var(--ink);
  border-top: var(--bd) solid var(--ink);
  background: var(--paper);
}
.wide .fixes .coverage {
  flex: 1 1 0;
  min-width: 160px;
}
.wide .fixes .minimap {
  flex: none;
  width: 150px;
  height: 64px;
}
.wide .fixes .under > :not(.coverage) {
  flex: none;
}
.wide .fixes .done-row .done {
  flex: 1;
}
</style>
