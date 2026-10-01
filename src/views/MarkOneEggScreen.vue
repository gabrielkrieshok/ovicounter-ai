<script setup>
import { computed, inject, ref } from 'vue'
import { useRouter } from 'vue-router'

import AppButton from '@/components/AppButton.vue'
import ImageStage from '@/components/ImageStage.vue'
import StripHeader from '@/components/StripHeader.vue'
import { judgeTapAgainstProbe } from '@/cv/probe'
import StepList from '@/components/StepList.vue'
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
const wide = inject('wideLayout', ref(false))
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

/* After the scan, back to where the correction was asked for. Reached from
   Refine, the operator was tuning and returns to the sliders with the new
   calibration; reached automatically because the probe found nothing, the
   flow continues as it would have. */
function go() {
  router.push({ name: 'processing', query: correcting.value ? { then: 'refine' } : {} })
}
</script>

<template>
  <div class="calibrate">
    <!-- Laptop: the finished steps, collapsed, above this one (StepList). -->
    <StepList v-if="wide" class="steps-before" part="before" />

    <StripHeader class="head" :title="t('calibrate.title')">
      <p class="sub t-body">{{ t('calibrate.sub') }}</p>
    </StripHeader>

    <div class="stage-wrap" @pointerup="onTap">
      <ImageStage
        ref="stage"
        :src="strip.working?.canvas ?? null"
        fit="cover"
        background="var(--stage-bg)"
      />

      <span v-if="ringStyle" class="ring" :style="ringStyle" />

      <div v-if="missed" class="echo">
        <span class="echo-text t-body">{{ t('calibrate.missed') }}</span>
      </div>
      <div v-else-if="echoCount !== null" class="echo" :class="{ stacked: mismatch }">
        <!-- A tap that disagrees with the probe is said out loud, above the
             echo, so the two signals — "this is unlike the others" and "this
             finds only N" — are read together. -->
        <span v-if="mismatch" class="echo-warn t-body">
          {{ t(mismatch === 'bigger' ? 'calibrate.tapBigger' : 'calibrate.tapSmaller') }}
        </span>
        <span class="echo-line">
          <span class="echo-ring" />
          <span class="echo-text t-body">
            {{ echoParts.before }}<b class="echo-count mono">{{ echoCount }}</b>{{ echoParts.after }}
          </span>
        </span>
      </div>
    </div>

    <div class="footer">
      <AppButton
        v-if="correcting && !measurement"
        variant="secondary"
        bar
        class="grow-1"
        @click="keepMarks"
      >
        {{ t('calibrate.keepMarks') }}
      </AppButton>
      <AppButton
        v-else
        variant="secondary"
        bar
        class="grow-1"
        :disabled="!measurement"
        @click="pickAnother"
      >
        {{ t('calibrate.pickAnother') }}
      </AppButton>
      <AppButton
        variant="primary"
        bar
        class="grow-13"
        :disabled="!measurement || busy"
        @click="go"
      >
        {{ t('calibrate.go') }}
      </AppButton>
    </div>

    <!-- Laptop: the steps still to come, below this one's actions. -->
    <StepList v-if="wide" class="steps-after" part="after" />
  </div>
</template>

<style scoped>
.calibrate {
  height: 100%;
  background: var(--paper);
  display: flex;
  flex-direction: column;
}

.sub {
  margin: 0;
}

.stage-wrap {
  flex: 1;
  position: relative;
  min-height: 0;
  overflow: hidden;
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
  color: var(--ink);
}
.echo-ring {
  flex: none;
  width: 14px;
  height: 14px;
  border: 2.5px dashed var(--blue);
  border-radius: 50%;
}

.footer {
  flex: none;
  display: flex;
  border-top: var(--bd) solid var(--ink);
}
.footer .grow-1 {
  flex: 1;
  border-top-width: 0;
  border-right-width: var(--bd);
}
.footer .grow-13 {
  flex: 1.3;
  border-top-width: 0;
}

/* Laptop (brief §5): instruction and buttons on the left, the photograph on
   the right. */
.wide .calibrate {
  display: grid;
  grid-template-columns: minmax(var(--device-w), var(--pane-share)) 1fr;
  grid-template-rows: auto auto 1fr auto auto;
}
.wide .calibrate > .head { grid-column: 1; grid-row: 2; }
.wide .calibrate > .footer { grid-column: 1; grid-row: 4; }
.wide .calibrate > .stage-wrap {
  grid-column: 2;
  grid-row: 1 / -1;
  border-left: var(--bd) solid var(--ink);
}
.wide .calibrate > .steps-before { grid-column: 1; grid-row: 1; }
.wide .calibrate > .steps-after { grid-column: 1; grid-row: -2; }
</style>
