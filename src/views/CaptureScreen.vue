<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import StatusBadge from '@/components/StatusBadge.vue'
import StripHeader from '@/components/StripHeader.vue'
import { useCv } from '@/cv/use-cv'
import { WORKING_LONG_EDGE, downscaledImageData } from '@/lib/image'
import { t } from '@/i18n'
import { useSessionStore } from '@/stores/session'
import { useStripStore } from '@/stores/strip'

/* Capture.
 *
 * "Checked as it comes in" is a live claim, so it is met with live checking:
 * the gate runs on a small frame from the viewfinder on a slow loop, and the
 * three chips report what it found. The operator learns the photograph is too
 * far away while they can still lean in, rather than after pressing the shutter.
 *
 * The loop is deliberately unhurried — a couple of times a second on a 480px
 * frame. It shares the worker with nothing else at this point in the flow, and
 * a viewfinder that stutters is worse than one that reacts a beat late.
 */

const router = useRouter()
const session = useSessionStore()
const strip = useStripStore()

const video = ref(null)
const fileInput = ref(null)
const cameraError = ref(null)
const busy = ref(false)
const checks = ref({ sharp: false, close: false, eggsVisible: false })

const CHECK_INTERVAL_MS = 600
const PREVIEW_LONG_EDGE = 480

let stream = null
let timer = null
let checking = false

const chips = computed(() => [
  { key: 'sharp', label: t('capture.chipSharp'), ok: checks.value.sharp },
  { key: 'close', label: t('capture.chipClose'), ok: checks.value.close },
  { key: 'eggs', label: t('capture.chipEggs'), ok: checks.value.eggsVisible },
])

onMounted(async () => {
  if (!session.isActive) {
    router.replace({ name: 'welcome' })
    return
  }
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 } },
      audio: false,
    })
    video.value.srcObject = stream
    await video.value.play()
    timer = setInterval(runLiveCheck, CHECK_INTERVAL_MS)
  } catch (error) {
    /* No camera, or permission refused. The gallery is a first-class path — the
       handoff calls it out on this screen — so this is a degraded screen, not a
       dead end. */
    cameraError.value = error?.message ?? 'no camera'
  }
})

onBeforeUnmount(stopCamera)

function stopCamera() {
  clearInterval(timer)
  timer = null
  for (const track of stream?.getTracks() ?? []) track.stop()
  stream = null
}

/** A frame from the viewfinder, at whatever size is asked for. */
function grabFrame(longEdge) {
  const el = video.value
  if (!el?.videoWidth) return null
  const scale = Math.min(1, longEdge / Math.max(el.videoWidth, el.videoHeight))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(el.videoWidth * scale)
  canvas.height = Math.round(el.videoHeight * scale)
  canvas.getContext('2d').drawImage(el, 0, 0, canvas.width, canvas.height)
  return canvas
}

async function runLiveCheck() {
  if (checking || busy.value) return
  const canvas = grabFrame(PREVIEW_LONG_EDGE)
  if (!canvas) return

  checking = true
  try {
    const { cv, ready } = useCv()
    await ready
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    const frame = ctx.getImageData(0, 0, canvas.width, canvas.height)
    /* The gate reasons about the WORKING image the pipeline will see, not about
       this preview, so it is told the ratio between them. */
    const verdict = await cv.assess(frame, {
      scale: Math.max(canvas.width, canvas.height) / WORKING_LONG_EDGE,
    })
    checks.value = verdict.checks
  } catch {
    /* A dropped frame is not worth reporting; the next one is 600ms away. */
  } finally {
    checking = false
  }
}

async function judgeAndGo(sourceUrl) {
  const { cv, ready } = useCv()
  await ready

  const frame = await downscaledImageData(sourceUrl, 900)
  const verdict = await cv.assess(frame, {
    scale: 900 / WORKING_LONG_EDGE,
  })

  strip.beginFromPhoto(sourceUrl)
  strip.gate = { pass: verdict.pass, reason: verdict.reason, metrics: verdict.metrics }

  if (verdict.pass) {
    stopCamera()
    router.push({ name: 'crop' })
  } else {
    /* A refused photograph does not advance the strip counter and never enters
       the record. It is counted only so the session summary can report it. */
    session.recordRefusal()
    stopCamera()
    router.push({ name: 'refusal' })
  }
}

async function shutter() {
  if (busy.value) return
  const canvas = grabFrame(WORKING_LONG_EDGE * 2)
  if (!canvas) return
  busy.value = true
  try {
    const blob = await new Promise((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', 0.92),
    )
    await judgeAndGo(URL.createObjectURL(blob))
  } finally {
    busy.value = false
  }
}

/* A gallery pick goes through the same gate as a camera frame. A photograph
   taken last week is no more countable than one taken badly just now. */
async function pickFile(event) {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (!file) return
  busy.value = true
  try {
    await judgeAndGo(URL.createObjectURL(file))
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="capture">
    <StripHeader class="head" :title="t('capture.strip', { n: session.stripNumber })" />

    <div class="viewfinder">
      <video ref="video" class="feed" playsinline muted />

      <div v-if="cameraError" class="no-camera t-body">{{ t('capture.noCamera') }}</div>

      <div class="guide" />
      <span class="caption t-title">{{ t('capture.guide') }}</span>

      <div class="bar">
        <button class="gallery" type="button" @click="fileInput.click()" aria-label="Open photo" />
        <button class="shutter" type="button" :disabled="busy || !!cameraError" @click="shutter" />
        <span class="from t-label">{{ t('capture.fromPhotos') }}</span>
      </div>

      <input
        ref="fileInput"
        class="file"
        type="file"
        accept="image/*"
        @change="pickFile"
      />
    </div>

    <div class="panel">
      <div class="panel-title t-title">{{ t('capture.checkedTitle') }}</div>
      <div class="chips">
        <!-- A check that has passed is ink; one that has not stays muted, so
             the row is a live report rather than a row of decorative ticks. -->
        <StatusBadge
          v-for="chip in chips"
          :key="chip.key"
          class="chip"
          :class="{ ok: chip.ok }"
          :tone="chip.ok ? 'ink' : 'muted'"
        >
          {{ chip.label }}
        </StatusBadge>
      </div>
    </div>
  </div>
</template>

<style scoped>
.capture {
  height: 100%;
  background: var(--stage-bg);
  display: flex;
  flex-direction: column;
}

.viewfinder {
  flex: 1;
  position: relative;
  min-height: 0;
  overflow: hidden;
}
.feed {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  background: var(--ink);
}
.no-camera {
  position: absolute;
  inset: auto var(--sp-22) 55%;
  text-align: center;
  color: var(--paper);
}

.guide {
  position: absolute;
  inset: 56px 22px 132px;
  border: var(--bd) dashed var(--cyan);
  border-radius: var(--r-badge);
  pointer-events: none;
}
.caption {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 142px;
  margin: 0 auto;
  width: fit-content;
  background: var(--scrim);
  color: var(--paper);
  padding: 6px var(--sp-12);
}

.bar {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  padding: var(--sp-16) 20px var(--sp-22);
  background: var(--scrim);
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.gallery {
  width: var(--hit-secondary);
  height: var(--hit-secondary);
  border: var(--bd) solid var(--paper);
  border-radius: var(--r-small);
  box-shadow: var(--halo-dark);
}
/* The shutter is this screen's one action, so it takes the action's look:
   a 76px square in safety yellow with an ink rule, like every primary bar. */
.shutter {
  width: var(--hit-primary);
  height: var(--hit-primary);
  border: var(--bd) solid var(--ink);
  outline: var(--bd) solid var(--paper);
  background: var(--action);
}
.shutter:disabled {
  background: var(--panel);
}
.from {
  width: var(--hit-secondary);
  color: var(--paper);
  text-align: center;
}

.file {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
  pointer-events: none;
}

.panel {
  flex: none;
  background: var(--panel);
  border-top: var(--bd) solid var(--ink);
  padding: var(--sp-12) var(--sp-16) var(--sp-14);
}
.panel-title {
  margin-bottom: var(--sp-8);
}
.chips {
  display: flex;
  flex-wrap: wrap;
  gap: var(--sp-8);
}

/* Laptop (brief §5): strip number and the live checks on the left, the
   viewfinder on the right at full height. */
.wide .capture {
  display: grid;
  grid-template-columns: minmax(var(--device-w), var(--pane-share)) 1fr;
  grid-template-rows: auto 1fr auto;
  background: var(--paper);
}
.wide .capture > .head { grid-column: 1; grid-row: 1; }
.wide .capture > .panel { grid-column: 1; grid-row: 3; }
.wide .capture > .viewfinder {
  grid-column: 2;
  grid-row: 1 / -1;
  border-left: var(--bd) solid var(--ink);
}
</style>
