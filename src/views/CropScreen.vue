<script setup>
import { computed, inject, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'

import AppButton from '@/components/AppButton.vue'
import ImageStage from '@/components/ImageStage.vue'
import StatusBadge from '@/components/StatusBadge.vue'
import StripHeader from '@/components/StripHeader.vue'
import StepList from '@/components/StepList.vue'
import { t } from '@/i18n'
import { boxFromTurned, boxToTurned, cropPreview } from '@/lib/image'
import { STEPS } from '@/lib/steps'
import { confirmRedo } from '@/lib/use-steps'
import { useSessionStore } from '@/stores/session'
import { useStripStore } from '@/stores/strip'

/* Crop & straighten.
 *
 * The box is proposed automatically and the operator drags it if it missed.
 * Confirming hands off to the scan, which runs during the transition out —
 * every screen the operator lands on contains a user action, so there is no
 * screen whose only content is waiting.
 */

const router = useRouter()
const wide = inject('wideLayout', ref(false))
const session = useSessionStore()
const strip = useStripStore()

const stage = ref(null)
const dragging = ref(null)
const busy = ref(false)

/* Corners can never cross or collapse the box. */
const MIN_SPAN = 0.05
const HANDLES = ['tl', 'tr', 'bl', 'br']
const STRAIGHTEN_STEP = 0.5

onMounted(async () => {
  /* Back here from a later step, the box is the one the marks were found on —
     proposing a fresh one would quietly change it. */
  if (strip.applied) return
  try {
    await strip.proposeCrop()
  } catch {
    /* No proposal is survivable — the box stays on the whole frame and the
       operator drags it. A failed proposal must not block the strip. */
  }
})

/* Leaving without confirming — back through the step list — puts the box back
   to the one the marks were found on, so the record never carries a crop the
   marks do not match. */
let committing = false
onBeforeUnmount(() => {
  if (!committing) strip.restoreAppliedCrop()
})

/* What the stage shows: the photograph straightened and turned exactly as it
   will be cropped (lib/image.js cropPreview), rebuilt when either changes. The
   box is stored before the turn and drawn after it. */
const preview = ref(null)
let building = 0
async function rebuildPreview() {
  if (!strip.sourceUrl) return
  const mine = ++building
  const canvas = await cropPreview(strip.sourceUrl, strip.straightenAngle, strip.quarterTurns)
  if (mine === building) preview.value = canvas
}
watch(() => [strip.sourceUrl, strip.straightenAngle, strip.quarterTurns], rebuildPreview, {
  immediate: true,
})

const box = computed(() => boxToTurned(strip.cropBox, strip.quarterTurns))

/* The crop box in stage pixels, from the photograph's own fitted rectangle. */
function boxRect(rect) {
  return {
    left: rect.left + box.value.l * rect.width,
    top: rect.top + box.value.t * rect.height,
    width: (box.value.r - box.value.l) * rect.width,
    height: (box.value.b - box.value.t) * rect.height,
  }
}

function handlePosition(id, rect) {
  const r = boxRect(rect)
  return {
    left: `${id === 'tl' || id === 'bl' ? r.left : r.left + r.width}px`,
    top: `${id === 'tl' || id === 'tr' ? r.top : r.top + r.height}px`,
  }
}

/* Undo: every change to the crop — a corner dragged, a turn, a nudge, a
   reset — can be taken back, one at a time. */
const past = ref([])
function remember() {
  past.value.push({
    cropBox: { ...strip.cropBox },
    quarterTurns: strip.quarterTurns,
    straightenAngle: strip.straightenAngle,
  })
}
function undo() {
  const last = past.value.pop()
  if (!last) return
  strip.cropBox = last.cropBox
  strip.quarterTurns = last.quarterTurns
  strip.straightenAngle = last.straightenAngle
}

/* Back to what the app proposed, the right way up. */
function reset() {
  remember()
  strip.cropBox = strip.proposedCrop ? { ...strip.proposedCrop.cropBox } : { l: 0, t: 0, r: 1, b: 1 }
  strip.straightenAngle = strip.proposedCrop?.straightenAngle ?? 0
  strip.quarterTurns = 0
}

function onDown(id, event) {
  remember()
  dragging.value = id
  event.currentTarget.setPointerCapture(event.pointerId)
}

function onMove(event) {
  if (!dragging.value || !stage.value) return
  const p = stage.value.toImage(event.clientX, event.clientY)
  if (!p) return

  const b = { ...box.value }
  const id = dragging.value
  const x = Math.min(1, Math.max(0, p.x))
  const y = Math.min(1, Math.max(0, p.y))

  if (id === 'tl' || id === 'bl') b.l = Math.min(x, b.r - MIN_SPAN)
  else b.r = Math.max(x, b.l + MIN_SPAN)
  if (id === 'tl' || id === 'tr') b.t = Math.min(y, b.b - MIN_SPAN)
  else b.b = Math.max(y, b.t + MIN_SPAN)

  strip.cropBox = boxFromTurned(b, strip.quarterTurns)
}

function onUp(event) {
  if (dragging.value) event.currentTarget.releasePointerCapture?.(event.pointerId)
  dragging.value = null
}

function rotate(turns) {
  remember()
  strip.quarterTurns = (((strip.quarterTurns + turns) % 4) + 4) % 4
}

function straighten(delta) {
  remember()
  strip.straightenAngle = Math.max(-15, Math.min(15, strip.straightenAngle + delta))
}

/**
 * Confirming the crop is the handoff to the scan. The working image is baked
 * and handed to the worker here, so the next screen opens on work already
 * begun rather than starting it.
 *
 * On a session's first strip the calibration is MEASURED here rather than
 * asked for: the probe (cv/probe.js) finds a representative egg across the
 * whole strip and the flow goes straight to Processing. Mark one egg is only
 * shown when the probe finds too few eggs to describe — and stays reachable
 * from Refine as the correction when the marks look wrong. Measured on the demo
 * strip, one tap gave 434 or 1,192 depending on where the finger landed; the
 * probe gives 364. That is why the tap is no longer the entry.
 */
async function useThisPhoto() {
  if (busy.value) return
  /* Returned to and left as it was: nothing to find again. Carry on to the
     furthest step already reached, with every mark and fix as it was. */
  if (strip.applied && !strip.cropChanged && strip.marks.length) {
    const furthest = STEPS.find((s) => s.key === strip.furthest)
    const ahead = furthest && ['refine', 'check'].includes(furthest.key) ? furthest.route : 'fixes'
    committing = true
    router.push({ name: ahead })
    return
  }
  if (strip.applied && !(await confirmRedo('redo'))) return
  committing = true
  busy.value = true
  try {
    await strip.applyCrop()
    if (!session.needsCalibration) {
      strip.useSessionCalibration()
      router.push({ name: 'processing' })
      return
    }
    const probe = strip.probeForEgg()
    if (probe) {
      await strip.adoptCalibration(probe, 'probe')
      router.push({ name: 'processing' })
    } else {
      router.push({ name: 'calibrate' })
    }
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="crop">
    <!-- Laptop: the finished steps, collapsed, above this one (StepList). -->
    <StepList v-if="wide" class="steps-before" part="before" />

    <StripHeader class="head" :title="t('crop.title')">
      <template #aside>
        <StatusBadge>{{ t('crop.stripBadge', { n: session.stripNumber }) }}</StatusBadge>
      </template>
    </StripHeader>

    <div class="body">
      <ImageStage ref="stage" :src="preview ?? strip.sourceUrl" fit="contain" v-slot="{ rect }">
        <!-- Everything outside the box is dimmed, so the box reads as the
             subject rather than as a decoration laid over the photograph. -->
        <div class="scrim top" :style="{ height: `${boxRect(rect).top}px` }" />
        <div
          class="scrim bottom"
          :style="{ top: `${boxRect(rect).top + boxRect(rect).height}px` }"
        />
        <div
          class="scrim left"
          :style="{
            top: `${boxRect(rect).top}px`,
            height: `${boxRect(rect).height}px`,
            width: `${boxRect(rect).left}px`,
          }"
        />
        <div
          class="scrim right"
          :style="{
            top: `${boxRect(rect).top}px`,
            height: `${boxRect(rect).height}px`,
            left: `${boxRect(rect).left + boxRect(rect).width}px`,
          }"
        />

        <div
          class="box"
          :style="{
            left: `${boxRect(rect).left}px`,
            top: `${boxRect(rect).top}px`,
            width: `${boxRect(rect).width}px`,
            height: `${boxRect(rect).height}px`,
          }"
        />

        <button
          v-for="id in HANDLES"
          :key="id"
          class="handle"
          type="button"
          :aria-label="`Crop corner ${id}`"
          :style="handlePosition(id, rect)"
          @pointerdown="onDown(id, $event)"
          @pointermove="onMove"
          @pointerup="onUp"
          @pointercancel="onUp"
        >
          <span class="grip" />
        </button>
      </ImageStage>


      <p class="caption t-body">{{ t('crop.caption') }}</p>
    </div>

    <!-- One row under the photograph, not over it: ⟲ ⟳ turn a quarter left
         and right, ‹ › straighten half a degree, then Undo and Reset. Each
         pair is drawn the same way round; a lone ⟳ beside a worded button had
         read as undo. Named for screen readers, and on hover. -->
    <div class="tools">
      <div class="pair">
        <button class="chip t-title" type="button" :aria-label="t('crop.rotateLeftName')" :title="t('crop.rotateLeftName')" @click="rotate(-1)">⟲</button>
        <button class="chip t-title" type="button" :aria-label="t('crop.rotateRightName')" :title="t('crop.rotateRightName')" @click="rotate(1)">⟳</button>
      </div>
      <div class="pair">
        <button class="chip t-title" type="button" :aria-label="t('crop.straightenLeftName')" :title="t('crop.straightenLeftName')" @click="straighten(-STRAIGHTEN_STEP)">‹</button>
        <button class="chip t-title" type="button" :aria-label="t('crop.straightenRightName')" :title="t('crop.straightenRightName')" @click="straighten(STRAIGHTEN_STEP)">›</button>
      </div>
      <div class="pair">
        <button class="chip t-title" type="button" :disabled="!past.length" @click="undo">{{ t('crop.undo') }}</button>
        <button class="chip t-title" type="button" @click="reset">{{ t('crop.reset') }}</button>
      </div>
    </div>

    <div class="footer">
      <AppButton variant="primary" bar :disabled="busy" @click="useThisPhoto">
        {{ t('crop.useThisPhoto') }}
      </AppButton>
    </div>

    <!-- Laptop: the steps still to come, below this one's actions. -->
    <StepList v-if="wide" class="steps-after" part="after" />
  </div>
</template>

<style scoped>
.crop {
  height: 100%;
  background: var(--stage-bg);
  display: flex;
  flex-direction: column;
}

/* The stage owns the whole area between header and footer, with the tools and
   the caption laid over it — the handoff's arrangement. Stacking them below the
   stage instead would shorten the photograph on the one screen whose entire job
   is judging where the paper's edges are. */
.body {
  flex: 1;
  position: relative;
  min-height: 0;
}

.body > :first-child {
  position: absolute;
  inset: 0;
}

.scrim {
  position: absolute;
  background: var(--scrim);
  pointer-events: none;
}
.scrim.top,
.scrim.bottom {
  left: 0;
  right: 0;
}
.scrim.top { top: 0; }
.scrim.bottom { bottom: 0; }
.scrim.left { left: 0; }
.scrim.right { right: 0; }

.box {
  position: absolute;
  border: var(--bd-crop) solid var(--cyan);
  pointer-events: none;
}

/* 44px, up from the handoff's 34 — every tap target is at least 44. The grip
   drawn inside stays small so it does not hide the corner it is placing. */
.handle {
  position: absolute;
  width: var(--hit-min);
  height: var(--hit-min);
  margin-left: calc(var(--hit-min) / -2);
  margin-top: calc(var(--hit-min) / -2);
  display: grid;
  place-items: center;
  touch-action: none;
}
.grip {
  width: 18px;
  height: 18px;
  background: var(--paper);
  border: var(--bd) solid var(--ink);
}

.tools {
  flex: none;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: var(--sp-8);
  padding: var(--sp-10) var(--sp-12);
  background: var(--stage-bg);
}
.pair {
  display: flex;
  gap: 4px;
}
.pair + .pair {
  padding-left: var(--sp-8);
  border-left: var(--bd-inner) solid var(--rule-idle);
}
.chip {
  min-width: var(--hit-min);
  min-height: var(--hit-min);
  padding: 0 var(--sp-10);
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--paper);
  border: var(--bd) solid var(--ink);
  border-radius: var(--r-small);
  color: var(--ink);
}

/* On ink, not on the photograph: a strip turned upright runs under it, and
   paper-white text on paper-white paper disappears. */
.chip:disabled {
  color: var(--disabled);
  cursor: default;
}

.caption {
  position: absolute;
  left: var(--sp-16);
  right: var(--sp-16);
  bottom: var(--sp-16);
  width: fit-content;
  margin: 0 auto;
  padding: 4px var(--sp-10);
  text-align: center;
  background: var(--ink);
  color: var(--paper);
}

.footer {
  flex: none;
}

/* Laptop (brief §5): header and the confirm on the left, the photograph on
   the right at full height with the rotate tools and caption over it. */
.wide .crop {
  display: grid;
  grid-template-columns: minmax(var(--device-w), var(--pane-share)) 1fr;
  grid-template-rows: auto auto 1fr auto auto auto;
  background: var(--paper);
}
.wide .crop > .head { grid-column: 1; grid-row: 2; }
.wide .crop > .tools { grid-column: 1; grid-row: 4; background: var(--paper); padding: var(--sp-10) var(--sp-16); justify-content: flex-start; }
.wide .crop > .footer { grid-column: 1; grid-row: 5; }
.wide .crop > .body {
  grid-column: 2;
  grid-row: 1 / -1;
  background: var(--stage-bg);
  border-left: var(--bd) solid var(--ink);
}
.wide .crop > .steps-before { grid-column: 1; grid-row: 1; }
.wide .crop > .steps-after { grid-column: 1; grid-row: -2; }
</style>
