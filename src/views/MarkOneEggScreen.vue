<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'

import AppButton from '@/components/AppButton.vue'
import ImageStage from '@/components/ImageStage.vue'
import { judgeTapAgainstProbe } from '@/cv/probe'
import { t, tParts } from '@/i18n'
import { useStripStore } from '@/stores/strip'

/* Mark one egg — the correction, no longer the entry.
 *
 * The measured egg sets the cutoff, the size filters and the watershed spacing
 * for every strip photographed under this light on this paper. Measured across
 * the bundled photographs an egg sits anywhere from ~44 to ~193 grey levels
 * below its paper, which is why this cannot be a shipped default.
 *
 * Since Sep 2026 the first measurement is made by the probe (cv/probe.js) on
 * Crop, because one tap turned out to be a sample of one: 434 or 1,192 marks on
 * the same demo strip depending on where the finger landed. This screen is
 * reached two ways — from Refine, when the marks look wrong, and automatically
 * when the probe found too few eggs to describe. When the probe DID measure
 * something, a tap is checked against it: a blob more than twice the probe's
 * median area (or less than half) is more likely a clump or a fragment than an
 * egg, and the screen says so before the operator commits to it.
 *
 * The echo — "Found N more the same size" — is a real scan with the parameters
 * this tap implies. It is the only honest way to show the operator what their
 * choice bought, and it costs about 30ms.
 *
 * §6.5: don't lay anything out that would hard-block a variant of this screen
 * reading a physical reference card in the frame instead of a tap. So the photo
 * stage is in charge of the layout and the tap is one way to fill it, not a
 * structural assumption.
 */

const router = useRouter()
const strip = useStripStore()

/* Reached from Refine as a correction, the strip already has marks. Until a
   tap replaces them, the secondary button is the way back to them — a screen
   with no exit but "change the calibration" would trap a curious operator. */
const correcting = computed(() => strip.calibrationSource !== null && strip.marks.length > 0)

const stage = ref(null)
const measurement = ref(null)
const echoCount = ref(null)
const missed = ref(false)
const busy = ref(false)

/* 'bigger' | 'smaller' | null — how the tapped blob compares with the probe's
   median egg, when there is a probe to compare against. */
const mismatch = ref(null)

/* `cover` rather than a CSS transform: it zooms by filling the frame with the
   middle of the strip, and — unlike scaling the stage — it keeps the mapping
   between the photograph's coordinates and the screen's intact, so the ring
   lands where the finger did.

   The number is styled separately from its sentence, so the string stays one
   translatable unit instead of three fragments a translator cannot reorder. */
const echoParts = computed(() => tParts('calibrate.echo', 'n'))

const ringStyle = computed(() => {
  if (!measurement.value || !stage.value) return null
  const p = stage.value.toStage(measurement.value.x, measurement.value.y)
  return { left: `${p.x}px`, top: `${p.y}px` }
})

async function onTap(event) {
  if (busy.value || !stage.value) return
  const p = stage.value.toImage(event.clientX, event.clientY)
  if (!p?.inside) return

  const found = strip.measureEggAt(p.x, p.y)
  if (!found) {
    // measureBlobAt refuses bare paper, stains and folds. Say so plainly.
    missed.value = true
    measurement.value = null
    echoCount.value = null
    mismatch.value = null
    return
  }

  missed.value = false
  measurement.value = found
  mismatch.value = judgeTapAgainstProbe(found, strip.probe)
  busy.value = true
  try {
    /* Adopted now so the echo is a real scan with exactly these parameters.
       "Looks right — go" is the commitment; "Pick another" replaces them. */
    const params = await strip.adoptCalibration(found, 'tap')
    const result = await strip.scan({ params })
    /* "More the same size" — the egg they marked is one of them, so it is not
       one of the others. */
    echoCount.value = Math.max(0, result.detections.length - 1)
  } finally {
    busy.value = false
  }
}

function pickAnother() {
  measurement.value = null
  echoCount.value = null
  missed.value = false
  mismatch.value = null
}

function keepMarks() {
  router.back()
}

function go() {
  router.push({ name: 'processing' })
}
</script>

<template>
  <div class="calibrate">
    <div class="head">
      <h1 class="title">{{ t('calibrate.title') }}</h1>
      <p class="sub">{{ t('calibrate.sub') }}</p>
    </div>

    <div class="stage-wrap" @pointerup="onTap">
      <ImageStage
        ref="stage"
        :src="strip.working?.canvas ?? null"
        fit="cover"
        background="var(--stage-bg)"
      />

      <span v-if="ringStyle" class="ring" :style="ringStyle" />

      <div v-if="missed" class="echo">
        <span class="echo-text">{{ t('calibrate.missed') }}</span>
      </div>
      <div v-else-if="echoCount !== null" class="echo" :class="{ stacked: mismatch }">
        <!-- A tap that disagrees with the probe is said out loud, above the
             echo, so the two signals — "this is unlike the others" and "this
             finds only N" — are read together. -->
        <span v-if="mismatch" class="echo-warn">
          {{ t(mismatch === 'bigger' ? 'calibrate.tapBigger' : 'calibrate.tapSmaller') }}
        </span>
        <span class="echo-line">
          <span class="echo-ring" />
          <span class="echo-text">
            {{ echoParts.before }}<b class="echo-count mono">{{ echoCount }}</b>{{ echoParts.after }}
          </span>
        </span>
      </div>
    </div>

    <div class="footer">
      <AppButton
        v-if="correcting && !measurement"
        variant="outline"
        :size="52"
        :font="15"
        class="grow-1"
        @click="keepMarks"
      >
        {{ t('calibrate.keepMarks') }}
      </AppButton>
      <AppButton
        v-else
        variant="outline"
        :size="52"
        :font="15"
        class="grow-1"
        :disabled="!measurement"
        @click="pickAnother"
      >
        {{ t('calibrate.pickAnother') }}
      </AppButton>
      <AppButton
        variant="filled"
        :size="62"
        :font="17"
        class="grow-13"
        :disabled="!measurement || busy"
        @click="go"
      >
        {{ t('calibrate.go') }}
      </AppButton>
    </div>
  </div>
</template>

<style scoped>
.calibrate {
  height: 100%;
  background: var(--paper);
  display: flex;
  flex-direction: column;
}

.head {
  padding: var(--sp-22) 20px var(--sp-14);
}
.title {
  margin: 0;
  font: 800 22px var(--font-sans);
  letter-spacing: -0.01em;
  line-height: 1.15;
}
.sub {
  margin: 6px 0 0;
  font: 400 15px var(--font-sans);
  color: var(--ink-soft);
  line-height: 1.45;
}

.stage-wrap {
  flex: 1;
  position: relative;
  min-height: 0;
  overflow: hidden;
  border-top: var(--bd) solid var(--ink);
  border-bottom: var(--bd) solid var(--ink);
  touch-action: none;
}

.ring {
  position: absolute;
  width: 32px;
  height: 32px;
  margin: -16px 0 0 -16px;
  border: 2.5px dashed var(--blue);
  border-radius: 50%;
  box-shadow: var(--halo-light);
  pointer-events: none;
}

.echo {
  position: absolute;
  left: var(--sp-14);
  right: var(--sp-14);
  bottom: var(--sp-14);
  width: fit-content;
  max-width: calc(100% - 2 * var(--sp-14));
  display: flex;
  align-items: center;
  gap: var(--sp-8);
  background: var(--paper);
  border: var(--bd) solid var(--ink);
  border-radius: var(--r-panel);
  padding: var(--sp-10) var(--sp-14);
}
.echo.stacked {
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
}
.echo-line {
  display: flex;
  align-items: center;
  gap: var(--sp-8);
}
.echo-warn {
  font: 600 14px var(--font-sans);
  color: var(--ink);
  line-height: 1.35;
}
.echo-ring {
  width: 14px;
  height: 14px;
  border: 2.5px dashed var(--blue);
  border-radius: 50%;
}
.echo-text {
  font: 600 14px var(--font-sans);
}
.echo-count {
  font: 700 15px var(--font-mono);
  font-variant-numeric: tabular-nums;
}

.footer {
  display: flex;
  align-items: center;
  gap: var(--sp-10);
  padding: var(--sp-16);
}
.grow-1 { flex: 1; }
.grow-13 { flex: 1.3; }

/* Laptop: photograph left, instruction top-right, buttons bottom-right. */
.wide .calibrate {
  display: grid;
  grid-template-columns: 1fr minmax(var(--device-w), var(--pane-share));
  grid-template-rows: auto 1fr auto;
}
.wide .calibrate > .head {
  grid-column: 2;
  grid-row: 1;
}
.wide .calibrate > .stage-wrap {
  grid-column: 1;
  grid-row: 1 / -1;
  border-top: 0;
  border-bottom: 0;
  border-right: var(--bd) solid var(--ink);
}
.wide .calibrate > .footer {
  grid-column: 2;
  grid-row: 3;
}
</style>
