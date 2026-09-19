<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import AppButton from '@/components/AppButton.vue'
import ImageStage from '@/components/ImageStage.vue'
import { t } from '@/i18n'
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
  try {
    await strip.proposeCrop()
  } catch {
    /* No proposal is survivable — the box stays on the whole frame and the
       operator drags it. A failed proposal must not block the strip. */
  }
})

const box = computed(() => strip.cropBox)

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

function onDown(id, event) {
  dragging.value = id
  event.currentTarget.setPointerCapture(event.pointerId)
}

function onMove(event) {
  if (!dragging.value || !stage.value) return
  const p = stage.value.toImage(event.clientX, event.clientY)
  if (!p) return

  const b = { ...strip.cropBox }
  const id = dragging.value
  const x = Math.min(1, Math.max(0, p.x))
  const y = Math.min(1, Math.max(0, p.y))

  if (id === 'tl' || id === 'bl') b.l = Math.min(x, b.r - MIN_SPAN)
  else b.r = Math.max(x, b.l + MIN_SPAN)
  if (id === 'tl' || id === 'tr') b.t = Math.min(y, b.b - MIN_SPAN)
  else b.b = Math.max(y, b.t + MIN_SPAN)

  strip.cropBox = b
}

function onUp(event) {
  if (dragging.value) event.currentTarget.releasePointerCapture?.(event.pointerId)
  dragging.value = null
}

function rotate(turns) {
  strip.quarterTurns = (((strip.quarterTurns + turns) % 4) + 4) % 4
}

function straighten(delta) {
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
    <header class="head">
      <span class="title">{{ t('crop.title') }}</span>
      <span class="badge mono">{{ t('crop.stripBadge', { n: session.stripNumber }) }}</span>
    </header>

    <div class="body">
      <ImageStage ref="stage" :src="strip.sourceUrl" fit="contain" v-slot="{ rect }">
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

      <div class="tools">
        <button class="chip" type="button" @click="rotate(-1)">{{ t('crop.rotateLeft') }}</button>
        <button class="chip" type="button" @click="straighten(-STRAIGHTEN_STEP)">
          {{ t('crop.straighten') }}
        </button>
        <button class="chip" type="button" @click="rotate(1)">{{ t('crop.rotateRight') }}</button>
      </div>

      <p class="caption">{{ t('crop.caption') }}</p>
    </div>

    <div class="footer">
      <AppButton variant="paper" :size="62" :font="18" :disabled="busy" @click="useThisPhoto">
        {{ t('crop.useThisPhoto') }}
      </AppButton>
    </div>
  </div>
</template>

<style scoped>
.crop {
  height: 100%;
  background: var(--stage-bg);
  display: flex;
  flex-direction: column;
}

.head {
  padding: var(--sp-14) var(--sp-16);
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.title {
  font: 700 15px var(--font-sans);
  color: var(--paper);
}
.badge {
  font: 500 12px var(--font-mono);
  color: var(--disabled);
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

.handle {
  position: absolute;
  width: var(--hit-small);
  height: var(--hit-small);
  margin-left: calc(var(--hit-small) / -2);
  margin-top: calc(var(--hit-small) / -2);
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
  position: absolute;
  left: 0;
  right: 0;
  bottom: 130px;
  display: flex;
  justify-content: center;
  gap: var(--sp-10);
}
.chip {
  height: var(--hit-min);
  padding: 0 var(--sp-14);
  display: flex;
  align-items: center;
  background: var(--paper);
  border: var(--bd) solid var(--ink);
  border-radius: var(--r-small);
  font: 600 14px var(--font-sans);
}

.caption {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 64px;
  margin: 0;
  padding: 0 var(--sp-16);
  text-align: center;
  font: 400 12px var(--font-sans);
  color: var(--disabled);
}

.footer {
  padding: 0 var(--sp-16) 18px;
}
</style>
