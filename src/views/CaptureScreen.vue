<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

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
    <header class="head">
      <span class="strip-n">{{ t('capture.strip', { n: session.stripNumber }) }}</span>
      <span class="session mono">{{ session.id ?? '' }}</span>
    </header>

    <div class="viewfinder">
      <video ref="video" class="feed" playsinline muted />

      <div v-if="cameraError" class="no-camera">{{ t('capture.noCamera') }}</div>

      <div class="guide" />
      <span class="caption">{{ t('capture.guide') }}</span>

      <div class="bar">
        <button class="gallery" type="button" @click="fileInput.click()" aria-label="Open photo" />
        <button class="shutter" type="button" :disabled="busy || !!cameraError" @click="shutter" />
        <span class="from">{{ t('capture.fromPhotos') }}</span>
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
      <div class="panel-title">{{ t('capture.checkedTitle') }}</div>
      <div class="chips">
        <span v-for="chip in chips" :key="chip.key" class="chip" :class="{ ok: chip.ok }">
          {{ chip.label }}
        </span>
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

.head {
  padding: var(--sp-14) var(--sp-16);
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.strip-n {
  font: 700 15px var(--font-sans);
  color: var(--paper);
}
.session {
  font: 500 12px var(--font-mono);
  color: var(--disabled);
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
  background: #000;
}
.no-camera {
  position: absolute;
  inset: auto var(--sp-22) 55%;
  text-align: center;
  font: 500 14px var(--font-sans);
  color: var(--paper);
  line-height: 1.45;
}

.guide {
  position: absolute;
  inset: 56px 22px 120px;
  border: var(--bd) dashed var(--cyan);
  border-radius: var(--r-badge);
  pointer-events: none;
}
.caption {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 130px;
  margin: 0 auto;
  width: fit-content;
  font: 600 13px var(--font-sans);
  background: var(--scrim);
  color: var(--paper);
  border-radius: var(--r-badge);
  padding: 6px var(--sp-12);
}

.bar {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  padding: var(--sp-16) 20px var(--sp-22);
  background: linear-gradient(transparent, rgba(20, 16, 12, 0.72));
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.gallery {
  width: 52px;
  height: 52px;
  border: var(--bd) solid var(--paper);
  border-radius: var(--r-small);
  background: rgba(255, 253, 249, 0.15);
  box-shadow: var(--halo-dark);
}
.shutter {
  width: 62px;
  height: 62px;
  border: 3px solid var(--paper);
  border-radius: 50%;
  background: rgba(255, 253, 249, 0.25);
  box-shadow: var(--halo-dark);
}
.shutter:disabled { opacity: 0.4; }
.from {
  width: 52px;
  font: 500 11px var(--font-sans);
  color: var(--paper);
  text-align: center;
  line-height: 1.3;
}

.file {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
  pointer-events: none;
}

.panel {
  background: var(--panel);
  border-top: var(--bd) solid var(--ink);
  padding: var(--sp-12) var(--sp-16) var(--sp-14);
}
.panel-title {
  font: 700 13px var(--font-sans);
  margin-bottom: 6px;
}
.chips {
  display: flex;
  gap: var(--sp-8);
}
.chip {
  font: 500 12px var(--font-sans);
  color: var(--disabled);
  border: var(--bd-fine) solid var(--rule-idle);
  border-radius: var(--r-badge);
  padding: 4px var(--sp-8);
  background: var(--paper);
}
/* A check that has actually passed reads as ink; one that has not stays muted,
   so the row is a live report rather than a row of decorative ticks. */
.chip.ok {
  color: var(--ink-soft);
  border-color: var(--ink);
}

/* Laptop: viewfinder left at full height, strip number top-right, the live
   checks bottom-right. */
.wide .capture {
  display: grid;
  grid-template-columns: 1fr minmax(var(--device-w), var(--pane-share));
  grid-template-rows: auto 1fr auto;
}
.wide .capture > .head {
  grid-column: 2;
  grid-row: 1;
}
.wide .capture > .viewfinder {
  grid-column: 1;
  grid-row: 1 / -1;
}
.wide .capture > .panel {
  grid-column: 2;
  grid-row: 3;
}
</style>
