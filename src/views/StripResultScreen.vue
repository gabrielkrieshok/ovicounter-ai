<script setup>
import { computed, onMounted, ref, toRaw } from 'vue'
import { useRouter } from 'vue-router'

import AppButton from '@/components/AppButton.vue'
import BandScale from '@/components/BandScale.vue'
import ImageStage from '@/components/ImageStage.vue'
import JudgmentTally from '@/components/JudgmentTally.vue'
import MarkLayer from '@/components/MarkLayer.vue'
import StatusBadge from '@/components/StatusBadge.vue'
import StripHeader from '@/components/StripHeader.vue'
import { bandFor } from '@/lib/bands'
import { DEMO_PHOTO } from '@/lib/samples'
import { t, tParts } from '@/i18n'
import { useSessionStore } from '@/stores/session'
import { useStripStore } from '@/stores/strip'

/* The count.
 *
 * The grey-to-black arc lands here. The machine's provisional total appears in
 * the header struck through — the only place on any screen it survives after
 * the operator has touched the marks — and the human's count stands black and
 * unqualified on the band scale below it. The two are never allowed to look
 * like the same kind of thing.
 *
 * Unless nobody checked. If the operator went straight through Your fixes
 * without removing, adding, splitting or even zooming in, there is no human
 * count to show: the machine total stands on the scale in machine styling, the
 * sentence says the marks were not checked, and the record says so too. The
 * alternative — "1,193 eggs, checked by you" with 0 removed and 0 added — was
 * what this screen used to say, and it broke the one rule that matters most.
 */

const router = useRouter()
const session = useSessionStore()
const strip = useStripStore()

/* 420ms hold on the count before the footer becomes the affordance moment. The
   number is what the operator came for; the next action can wait for them to
   have read it. */
const ready = ref(false)

const checked = computed(() => strip.reviewed)
const humanCount = computed(() => strip.humanCount)
/* The number on the scale: the person's when they checked, the machine's when
   they did not. Never both, never mixed. */
const shownCount = computed(() => (checked.value ? humanCount.value : strip.machineTotal))
const band = computed(() => bandFor(shownCount.value, session.bands))

/* Machine marks the operator kept — not the machine's total, which is in the
   header. This is a breakdown of the human's own judgments. */
const keptMachine = computed(
  () => strip.marks.filter((m) => m.source === 'machine' && m.status === 'kept').length,
)

/* One translatable string with the band name lifted out, so a translator
   can put the band wherever their grammar wants it. */
const sentence = computed(() =>
  checked.value
    ? tParts('result.sentence', 'band', { n: humanCount.value })
    : { before: t('result.unchecked', { n: strip.machineTotal }), after: '' },
)

/* The badge must not claim a record was saved unless one was. The demo promises
   on Welcome that it saves nothing, and until persistence exists nothing is
   saved in a real session either. */
const savedBadge = computed(() => {
  if (session.recordsPersist) return t('result.saved')
  if (session.isDemo) return t('result.notSavedDemo')
  if (session.isQuick) return t('result.notSavedQuick')
  return t('result.notSavedYet')
})

const quick = computed(() => session.isQuick)

onMounted(() => {
  if (!strip.working) {
    router.replace({ name: 'welcome' })
    return
  }

  /* Record once. Coming back to this screen must not add the strip twice, and
     the record — photo, settings, marks — is the artifact, so a duplicate is
     not a cosmetic problem. */
  if (!strip.recorded) {
    strip.recorded = true
    session.completeStrip(
      {
      sourceUrl: strip.sourceUrl,
      cropBox: { ...strip.cropBox },
      quarterTurns: strip.quarterTurns,
      straightenAngle: strip.straightenAngle,
      /* Raw, not the store's reactive Proxy: IndexedDB structured-clones the
         record and a Proxy throws DataCloneError — the same failure the worker
         boundary had. The demo never showed it because a demo has no gate
         verdict; the first real session through the gallery picker did. */
      gate: strip.gate ? toRaw(strip.gate) : null,
      params: { ...strip.params },
        marks: strip.marks.map((m) => ({ ...m })),
        machineTotal: strip.machineTotal,
        /* Whether a person reviewed the marks. When false, `count` is the
           machine's total and the marks are still `proposed` — the record
           carries no human judgment it did not get. */
        checked: checked.value,
        count: shownCount.value,
        band: band.value.key,
      },
      strip.working?.canvas,
    ).catch((error) => {
      /* Writing failed — a full disk, or private browsing. The badge below
         reads from `recordsPersist`, so the screen will not claim otherwise.
         Said in the console too, so the flow walker sees it. */
      console.error('strip record not written:', error)
      session.storageReady = false
    })
  }

  setTimeout(() => {
    ready.value = true
  }, 420)
})

/* Calibration is carried forward, so the next strip skips Mark one egg. That
   is the loop getting lighter, which is the product. */
function nextStrip() {
  const wasDemo = session.isDemo
  strip.$reset()
  if (wasDemo) {
    /* The demo has one bundled photograph, so a second strip is the same one
       again. It is honest about what it demonstrates — the loop, and
       calibration carrying forward — rather than pretending to a new strip. */
    strip.beginFromPhoto(DEMO_PHOTO)
    router.push({ name: 'crop' })
  } else {
    router.push({ name: 'capture' })
  }
}

function endSession() {
  router.push({ name: 'summary' })
}

/* Quick count: the next strip stands alone — the probe measures it afresh and
   this one is dropped, as the badge above promised. */
function countAnother() {
  const wasDemo = session.isDemo
  session.countAnother()
  strip.$reset()
  if (wasDemo) {
    strip.beginFromPhoto(DEMO_PHOTO)
    router.push({ name: 'crop' })
  } else {
    router.push({ name: 'capture' })
  }
}

/* The person asked to keep going: this strip becomes strip 1 of a real
   session, saved now, with its calibration carried to the next. Not offered on
   the demo, whose calibration belongs to a bundled photograph and would be
   carried onto real paper. */
async function startSessionFromHere() {
  await session.promote(strip.working?.canvas)
  strip.$reset()
  router.push({ name: 'capture' })
}

function backHome() {
  session.end()
  strip.$reset()
  router.push({ name: 'welcome' })
}
</script>

<template>
  <div class="result">
    <StripHeader class="head" :title="t('result.title', { n: session.strips.length })">
      <!-- Struck through, grey, mono, with a leading `~`. Everything about it
           says "superseded" — so it only appears when something superseded it. -->
      <template v-if="checked" #aside>
        <span class="machine t-count-machine">~{{ strip.machineTotal }}</span>
      </template>
    </StripHeader>

    <div class="count-block">
      <BandScale :count="shownCount" :bands="session.bands" :machine="!checked" />
      <p class="sentence" :class="{ unchecked: !checked }">
        <template v-if="checked">
          {{ sentence.before }}<b>{{ t(`bands.${band.key}`).toUpperCase() }}</b>{{ sentence.after }}
        </template>
        <template v-else>{{ sentence.before }}</template>
      </p>
    </div>

    <!-- The legend is a breakdown of the person's judgments. With none made
         there is nothing to break down. -->
    <JudgmentTally
      v-if="checked"
      class="legend"
      :cells="[
        { kind: 'kept', n: keptMachine },
        { kind: 'removed', n: strip.removedCount },
        { kind: 'added', n: strip.addedCount },
      ]"
    />

    <div class="thumb">
      <ImageStage
        :src="strip.working?.canvas ?? null"
        fit="contain"
        background="var(--stage-bg)"
        v-slot="{ rect, stage }"
      >
        <MarkLayer :marks="strip.marks" :rect="rect" :stage="stage" />
      </ImageStage>
      <!-- Only claims a record was saved when one actually was. -->
      <StatusBadge class="saved" :tone="session.recordsPersist ? 'ink' : 'muted'">
        {{ savedBadge }}
      </StatusBadge>
    </div>

    <div v-if="quick" class="footer stack" :class="{ ready }">
      <AppButton variant="primary" :disabled="!ready" @click="countAnother">
        {{ t('result.countAnother') }}
      </AppButton>
      <AppButton
        v-if="!session.isDemo"
        variant="secondary"
        :disabled="!ready"
        @click="startSessionFromHere"
      >
        {{ t('result.startSession') }}
      </AppButton>
      <AppButton v-else variant="secondary" :disabled="!ready" @click="backHome">
        {{ t('summary.backHome') }}
      </AppButton>
    </div>

    <div v-else class="footer" :class="{ ready }">
      <AppButton
        variant="secondary"
        class="grow-1"
        :disabled="!ready"
        @click="endSession"
      >
        {{ t('result.endSession') }}
      </AppButton>
      <AppButton
        variant="primary"
        class="grow-14"
        :disabled="!ready"
        @click="nextStrip"
      >
        {{ t('result.nextStrip') }}
      </AppButton>
    </div>
  </div>
</template>

<style scoped>
.result {
  height: 100%;
  background: var(--paper);
  display: flex;
  flex-direction: column;
}

.machine {
  text-decoration: line-through;
}

.count-block {
  padding: 34px 20px var(--sp-10);
}
.sentence {
  margin: var(--sp-10) 0 0;
  text-align: center;
  font: 400 15px var(--font-sans);
  color: var(--ink);
}
.sentence.unchecked {
  color: var(--muted);
  padding-bottom: var(--sp-14);
}

.legend {
  margin: var(--sp-10) 0;
}

.thumb {
  margin: 6px var(--sp-16);
  flex: 1;
  min-height: 120px;
  position: relative;
  border: var(--bd) solid var(--ink);
  border-radius: var(--r-primary);
  overflow: hidden;
}
.saved {
  position: absolute;
  right: var(--sp-10);
  bottom: var(--sp-8);
}

.footer {
  display: flex;
  gap: var(--sp-10);
  padding: var(--sp-16);
  opacity: 0;
  transition: opacity 0.12s linear;
}
.footer.ready { opacity: 1; }
.footer.stack {
  flex-direction: column;
  padding-top: var(--sp-10);
}
.grow-1 { flex: 1; }
.grow-14 { flex: 1.4; }

/* Laptop: the checked strip left at full height; title, scale, legend and the
   next action in the right pane. */
.wide .result {
  display: grid;
  grid-template-columns: 1fr minmax(var(--device-w), var(--pane-share));
  grid-template-rows: auto auto auto 1fr auto;
}
.wide .result > .head {
  grid-column: 2;
  grid-row: 1;
}
.wide .result > .count-block {
  grid-column: 2;
  grid-row: 2;
}
.wide .result > .legend {
  grid-column: 2;
  grid-row: 3;
}
.wide .result > .thumb {
  grid-column: 1;
  grid-row: 1 / -1;
  margin: var(--sp-16);
}
.wide .result > .footer {
  grid-column: 2;
  grid-row: 5;
}
</style>
