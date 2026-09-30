<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import AppButton from '@/components/AppButton.vue'
import MagnifierLoupe from '@/components/MagnifierLoupe.vue'
import MarkLayer from '@/components/MarkLayer.vue'
import ZoomPanStage from '@/components/ZoomPanStage.vue'
import { t } from '@/i18n'
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

onMounted(() => {
  if (!strip.working) {
    router.replace({ name: 'welcome' })
    return
  }
  /* Arriving here, the proposals become kept — green — because that is what
     they will be if the operator does nothing, and the screen should show the
     count they would sign off on rather than a promise about one. Blue is for
     marks nobody has looked at yet, and someone is looking now. */
  strip.acceptRemainingMarks()
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
  <div class="fixes">
    <header class="head">
      <h1 class="title">{{ t('fixes.title') }}</h1>
      <p class="sub">{{ t('fixes.sub') }}</p>
    </header>

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

        <span v-if="!hold && stroke.length < 2" class="hint">{{ t('fixes.splitHint') }}</span>
      </ZoomPanStage>
    </div>

    <div class="footer">
      <button v-if="session.isQuick" class="relink" type="button" @click="adjust">
        {{ t('fixes.adjust') }}
      </button>
      <div class="legend">
        <span class="item kept"><span class="ring" />{{ t('fixes.legendKept') }}</span>
        <span class="item removed">{{ t('fixes.legendRemoved') }}</span>
        <span class="item added">{{ t('fixes.legendAdded') }}</span>
        <button
          class="undo"
          type="button"
          :disabled="!strip.history.length"
          @click="strip.undo()"
        >
          {{ t('fixes.undo') }}
        </button>
      </div>

      <AppButton variant="filled" :size="62" :font="18" @click="done">
        {{ t('fixes.done') }}
      </AppButton>
    </div>
  </div>
</template>

<style scoped>
.fixes {
  height: 100%;
  background: var(--paper);
  display: flex;
  flex-direction: column;
}

.head {
  padding: var(--sp-14) 20px;
  background: var(--panel);
  border-bottom: var(--bd) solid var(--ink);
}
.title {
  margin: 0;
  font: 700 16px var(--font-sans);
}
.sub {
  margin: 2px 0 0;
  font: 400 13px var(--font-sans);
  color: var(--ink-soft);
}

.stage-wrap {
  flex: 1;
  position: relative;
  min-height: 0;
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

.hint {
  position: absolute;
  left: var(--sp-14);
  bottom: var(--sp-14);
  background: var(--paper);
  border: var(--bd-fine) solid var(--ink);
  border-radius: var(--r-badge);
  padding: 6px var(--sp-10);
  font: 500 12px var(--font-sans);
  color: var(--ink-soft);
  pointer-events: none;
}

.footer {
  border-top: var(--bd) solid var(--ink);
  padding: var(--sp-12) var(--sp-16) var(--sp-16);
}

.legend {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px var(--sp-12);
  margin-bottom: var(--sp-12);
}
/* A label never breaks inside itself — in Spanish and Portuguese it did,
   leaving "✕" on one line and "retirada" under it. A long language wraps whole
   items onto a second row instead; English still fits on one. */
.item {
  display: flex;
  align-items: center;
  gap: 5px;
  white-space: nowrap;
  font: 500 13px var(--font-sans);
  color: var(--ink-soft);
}
.item.removed {
  font-weight: 600;
  color: var(--red);
}
.item.added {
  font-weight: 600;
  color: var(--pink);
}
.ring {
  width: 11px;
  height: 11px;
  border: 2.5px solid var(--green);
  border-radius: 50%;
}

.undo {
  margin-left: auto;
  height: var(--hit-min);
  padding: 0 var(--sp-14);
  display: flex;
  align-items: center;
  font: 600 14px var(--font-sans);
  border: var(--bd) solid var(--ink);
  border-radius: var(--r-small);
  background: var(--paper);
}
.undo:disabled {
  color: var(--disabled);
  border-color: var(--rule-idle);
}

.relink {
  min-height: var(--hit-min);
  margin-top: calc(-1 * var(--sp-8));
  display: flex;
  align-items: center;
  font: 600 14px var(--font-sans);
  color: var(--blue);
  text-decoration: underline;
  text-underline-offset: 3px;
}

/* Laptop: stage left at full height, header top-right, legend and Done
   bottom-right. */
.wide .fixes {
  display: grid;
  grid-template-columns: 1fr minmax(var(--device-w), var(--pane-share));
  grid-template-rows: auto 1fr auto;
}
.wide .fixes > .head {
  grid-column: 2;
  grid-row: 1;
}
.wide .fixes > .stage-wrap {
  grid-column: 1;
  grid-row: 1 / -1;
  border-right: var(--bd) solid var(--ink);
}
.wide .fixes > .footer {
  grid-column: 2;
  grid-row: 3;
  border-top: 0;
}
</style>
