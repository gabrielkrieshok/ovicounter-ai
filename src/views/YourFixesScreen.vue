<script setup>
import { computed, inject, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'

import AppButton from '@/components/AppButton.vue'
import CoverageBar from '@/components/CoverageBar.vue'
import JudgmentTally from '@/components/JudgmentTally.vue'
import MagnifierLoupe from '@/components/MagnifierLoupe.vue'
import MarkKey from '@/components/MarkKey.vue'
import MarkLayer from '@/components/MarkLayer.vue'
import Overview from '@/components/Overview.vue'
import StripHeader from '@/components/StripHeader.vue'
import ZoomPanStage from '@/components/ZoomPanStage.vue'
import ZoomRail from '@/components/ZoomRail.vue'
import StepList from '@/components/StepList.vue'
import { t, weekday } from '@/i18n'
import { markAt } from '@/lib/marks'
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

function onTap(point) {
  if (!point || !stage.value) return
  const mark = markAt(strip.marks, point, stage.value.rect)
  if (mark) strip.toggleMark(mark.id)
}

function onAdd(point) {
  if (!point) return
  const inside = point.x >= 0 && point.x <= 1 && point.y >= 0 && point.y <= 1
  if (inside) strip.addMark(point)
}

async function onStroke(points) {
  const usable = points.filter(Boolean)
  if (usable.length > 1) await strip.splitAlong(usable)
}

/* A quick count skipped Refine on the way here; this is the way to it. */
function adjust() {
  router.push({ name: 'refine' })
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
      <!-- Bulleted with the marks each gesture makes, not numbered: numbers
           here read as more steps in the step list beside them. -->
      <ul v-if="wide" class="howto">
        <li><span class="glyph removed t-title" aria-hidden="true">✕</span><span class="t-body">{{ t('fixes.step1') }}</span></li>
        <li><span class="glyph added t-title" aria-hidden="true">+</span><span class="t-body">{{ t('fixes.step2') }}</span></li>
        <li><span class="glyph split t-title" aria-hidden="true">╱</span><span class="t-body">{{ t('fixes.step3') }}</span></li>
      </ul>
      <div v-else class="cells">
        <span class="cell t-label">{{ t('fixes.cellTap') }}</span>
        <span class="cell t-label">{{ t('fixes.cellHold') }}</span>
        <span class="cell t-label">{{ t('fixes.cellLine') }}</span>
      </div>
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
      />
      <CoverageBar tone="dark" :looked="strip.looked" />
    </div>

    <div class="stage-wrap">
      <ZoomPanStage
        ref="stage"
        :src="strip.working?.canvas ?? null"
        background="var(--stage-bg)"
        @tap="onTap"
        @add="onAdd"
        @stroke="onStroke"
        @navigate="strip.noteReview()"
        v-slot="{ rect, stage: size, hold, stroke }"
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
      <CoverageBar class="coverage" :looked="strip.looked" :viewport="viewport" />
      <MarkKey layout="row" :show="['kept', 'removed', 'added']" />
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

    <div v-if="session.isQuick" class="adjust">
      <AppButton variant="quiet" @click="adjust">{{ t('fixes.adjust') }}</AppButton>
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

.cells {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  border: var(--bd) solid var(--ink);
}
.cell {
  padding: var(--sp-8) var(--sp-8);
  display: flex;
  align-items: center;
}
.cell + .cell {
  border-left: var(--bd) solid var(--ink);
}

.howto {
  list-style: none;
  margin: var(--sp-8) 0 0;
  padding: 0 0 0 var(--sp-8);
  display: flex;
  flex-direction: column;
  gap: var(--sp-8);
}
.howto li {
  display: flex;
  align-items: baseline;
  gap: var(--sp-12);
}
.glyph {
  flex: none;
  width: 18px;
  text-align: center;
}
.glyph.removed { color: var(--red); }
.glyph.added { color: var(--pink); }
.glyph.split { color: var(--ink); }

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
.wide .fixes .under > :not(.coverage) {
  flex: none;
}
.wide .fixes .done-row .done {
  flex: 1;
}
</style>
