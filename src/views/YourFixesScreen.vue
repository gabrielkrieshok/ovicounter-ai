<script setup>
import { computed, inject, onMounted, ref, watch } from 'vue'
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
import { useSessionStore } from '@/stores/session'
import { useStripStore } from '@/stores/strip'

/* Your fixes — where the count stops being the machine's and becomes the
 * operator's.
 *
 * Every ✕ and every + here is recorded as a human judgment, and the record —
 * the photograph, the settings, and these positions — is the product. The count
 * is only a projection of it.
 *
 * Rejecting has to be the cheapest gesture on the screen (§6.3), so it is a
 * bare tap with no modifier, no mode and no confirmation. Everything else costs
 * more: adding needs a deliberate hold, splitting needs a drawn stroke, and
 * navigating needs a second finger. See ZoomPanStage for why the one-finger
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

/* Human judgments only (non-negotiable 1). The phone has room for two and
   Undo; the laptop column has room for splits too. */
const tally = computed(() => {
  const cells = [
    { kind: 'removed', n: strip.removedCount },
    { kind: 'added', n: strip.addedCount },
  ]
  if (wide.value) cells.push({ kind: 'split', n: strip.splitCount })
  return cells
})

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
  <div class="fixes" :class="{ zoomed: zoom > 1.001 }">
    <!-- Laptop: the finished steps, collapsed, above this one (StepList). -->
    <StepList v-if="wide" class="steps-before" part="before" />

    <StripHeader class="head" :title="t('fixes.title')" :eyebrow="wide ? eyebrow : ''">
      <!-- Pick what one finger does; the line under says how, and that two
           fingers move the strip. -->
      <ToolPicker v-model="tool" />
      <p class="tool-hint t-body">
        {{ t(`fixes.hint${tool.charAt(0).toUpperCase()}${tool.slice(1)}`) }}
        <span class="two-fingers">{{ t('fixes.twoFingers') }}</span>
      </p>
    </StripHeader>

    <!-- Phone: zoomed past 1, a band above the stage shows the whole strip with
         a box for where you are and the parts already looked at. At zoom 1 it
         collapses (Gabriel, Sep 30): the stage already shows the whole strip,
         and showing it twice costs the stage 132px. The stage keeps the photo
         still on screen as the band arrives (ZoomPanStage `measure`). -->
    <div v-if="!wide && zoom > 1.001" class="band">
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
        :tool="tool"
        @paintstart="onPaintStart"
        @paint="onPaint"
        @paintend="onPaintEnd"
        @add="onAdd"
        @stroke="onStroke"
        @navigate="strip.noteReview()"
        v-slot="{ rect, stage: size, hold, stroke, brush }"
      >
        <MarkLayer :marks="strip.marks" :rect="rect" :stage="size" />

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

    <JudgmentTally class="tally" :cells="tally">
      <!-- Only on the phone. A slot passed but left empty would still draw a
           fourth, blank cell. -->
      <template v-if="!wide" #default>
        <AppButton
          class="undo"
          variant="secondary"
          :disabled="!strip.history.length"
          @click="strip.undo()"
        >
          {{ t('fixes.undo') }}
        </AppButton>
      </template>
    </JudgmentTally>

    <div class="adjust">
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
      <AppButton
        v-if="wide"
        class="undo"
        variant="secondary"
        bar
        :disabled="!strip.history.length"
        @click="strip.undo()"
      >
        {{ t('fixes.undo') }}
      </AppButton>
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
.done-row .undo {
  flex: 0 0 auto;
  width: auto;
  min-height: var(--hit-primary);
  padding: 0 var(--sp-22);
  border-top-width: var(--bd);
  border-right-width: var(--bd);
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
