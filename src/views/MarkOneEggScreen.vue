<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'

import AppButton from '@/components/AppButton.vue'
import ImageStage from '@/components/ImageStage.vue'
import { t, tParts } from '@/i18n'
import { useStripStore } from '@/stores/strip'

/* Mark one egg — once per session.
 *
 * The fixed cost of the whole session, paid here and carried forward: the
 * measured egg sets the cutoff, the size filters and the watershed spacing for
 * every strip photographed under this light on this paper. Measured across the
 * bundled photographs an egg sits anywhere from ~44 to ~193 grey levels below
 * its paper, which is why this cannot be a shipped default.
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

const stage = ref(null)
const measurement = ref(null)
const echoCount = ref(null)
const missed = ref(false)
const busy = ref(false)

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
    return
  }

  missed.value = false
  measurement.value = found
  busy.value = true
  try {
    const params = await strip.adoptCalibration(found)
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
      <div v-else-if="echoCount !== null" class="echo">
        <span class="echo-ring" />
        <span class="echo-text">
          {{ echoParts.before }}<b class="echo-count mono">{{ echoCount }}</b>{{ echoParts.after }}
        </span>
      </div>
    </div>

    <div class="footer">
      <AppButton
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
  bottom: var(--sp-14);
  display: flex;
  align-items: center;
  gap: var(--sp-8);
  background: var(--paper);
  border: var(--bd) solid var(--ink);
  border-radius: var(--r-panel);
  padding: var(--sp-10) var(--sp-14);
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
</style>
