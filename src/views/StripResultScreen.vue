<script setup>
import { computed, inject, onMounted, ref, toRaw } from 'vue'
import { useRouter } from 'vue-router'

import AppButton from '@/components/AppButton.vue'
import BandScale from '@/components/BandScale.vue'
import ImageStage from '@/components/ImageStage.vue'
import JudgmentTally from '@/components/JudgmentTally.vue'
import MarkLayer from '@/components/MarkLayer.vue'
import StatusBadge from '@/components/StatusBadge.vue'
import { bandFor } from '@/lib/bands'
import { demoPhoto } from '@/lib/samples'
import StepList from '@/components/StepList.vue'
import StepNumber from '@/components/StepNumber.vue'
import { i18n, t, tParts } from '@/i18n'
import { shareOrSave, storyImage } from '@/lib/share'
import { useSessionStore } from '@/stores/session'
import { useStripStore } from '@/stores/strip'

/* The count.
 *
 * The grey-to-black arc lands here. The machine's provisional total appears in
 * the header as "app found ~n" — the only place on any screen it survives after
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
const wide = inject('wideLayout', ref(false))
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

  /* Record the strip — once, and again in place when the person went back from
     Count and returned (Oct 2026). Coming back must never add the strip twice:
     the record — photo, settings, marks — is the artifact, so a duplicate is
     not a cosmetic problem. */
  {
    const again = strip.recorded
    strip.recorded = true
    if (!again) strip.recordedIndex = session.strips.length
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
        /* Each clump with the app's two counts and, where the person gave
           one, theirs — without the pixel sample used to place its marks. */
        clumps: strip.clumps.map(({ points, ...c }) => ({ ...c })),
        machineTotal: strip.machineTotal,
        /* Whether a person reviewed the marks. When false, `count` is the
           machine's total and the marks are still `proposed` — the record
           carries no human judgment it did not get. */
        checked: checked.value,
        /* Which of the parts were looked at close up. Machine marks in the
           others are still `proposed` — accepted by Done, never judged. */
        looked: [...strip.looked],
        count: shownCount.value,
        band: band.value.key,
      },
      strip.working?.canvas,
      again ? strip.recordedIndex : null,
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
  buildCard()
})

/* Calibration is carried forward, so the next strip skips Mark one egg. That
   is the loop getting lighter, which is the product. */
async function nextStrip() {
  const wasDemo = session.isDemo
  strip.$reset()
  if (wasDemo) {
    /* The demo's photograph again (or a fresh test pattern). It is honest
       about what it demonstrates — the loop, and calibration carrying forward
       — rather than pretending to a new strip. */
    const { url, drawn } = await demoPhoto(session.demoKind)
    strip.beginFromPhoto(url, { drawn })
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
async function countAnother() {
  const wasDemo = session.isDemo
  session.countAnother()
  strip.$reset()
  if (wasDemo) {
    const { url, drawn } = await demoPhoto(session.demoKind)
    strip.beginFromPhoto(url, { drawn })
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

/* Share (Oct 2026): one story-shaped card — the photograph, the marks, the
   count — previewed here before anything is sent, and sent only to where the
   person picks in their own share sheet. Where files cannot be shared (most
   laptops), the card is saved and the summary copied, and the screen says so. */
const sharing = ref(false)
const shareNote = ref('')
const preview = ref('')
let card = null

function summaryLines() {
  const bandName = t(`bands.${band.value.key}`).toUpperCase()
  const said = checked.value
    ? t('result.sentence', { n: humanCount.value, band: bandName })
    : t('result.unchecked', { n: strip.machineTotal })
  const date = new Date().toLocaleDateString(i18n.locale, { day: 'numeric', month: 'long', year: 'numeric' })
  return { said, date }
}

async function buildCard() {
  if (!strip.working || !strip.sourceUrl) return null
  const { said, date } = summaryLines()
  const judged = checked.value
    ? [
        { kind: 'removed', text: `✕ ${strip.removedCount} ${t('tally.removed')}` },
        { kind: 'added', text: `+ ${strip.addedCount} ${t('tally.added')}` },
      ]
    : null
  const blob = await storyImage({
    clumps: strip.clumps,
    photoUrl: strip.sourceUrl,
    working: strip.working.canvas,
    marks: strip.marks,
    checked: checked.value,
    count: checked.value ? String(humanCount.value) : `~${strip.machineTotal}`,
    bandKey: band.value.key,
    text: {
      date,
      photo: t('share.photoLabel'),
      marks: t(checked.value ? 'share.marksChecked' : 'share.marksFound'),
      countLabel: t('share.countLabel'),
      sentence: strip.drawn !== null ? `${said} ${t('result.testDrawn', { n: strip.drawn })}.` : said,
      judged,
      footer: t('share.footer'),
      bands: session.bands.map((b) => ({ key: b.key, weight: b.weight, label: t(`bands.${b.key}`) })),
    },
  })
  card = blob
  if (preview.value) URL.revokeObjectURL(preview.value)
  preview.value = URL.createObjectURL(blob)
  return blob
}

async function share() {
  if (sharing.value || !strip.working) return
  sharing.value = true
  shareNote.value = ''
  try {
    const blob = card ?? (await buildCard())
    const { said, date } = summaryLines()
    const stem = `ovicounter-${new Date().toISOString().slice(0, 10)}`
    const files = [new File([blob], `${stem}.jpg`, { type: 'image/jpeg' })]
    const lines = ['OvicounterAI', said, date]
    if (strip.drawn !== null) lines.push(t('result.testDrawn', { n: strip.drawn }))
    const outcome = await shareOrSave({ files, text: lines.join('\n'), title: 'OvicounterAI' })
    if (outcome === 'saved') shareNote.value = t('share.saved')
  } finally {
    sharing.value = false
  }
}

function backHome() {
  session.end()
  strip.$reset()
  router.push({ name: 'welcome' })
}
</script>

<template>
  <div class="result">
    <!-- Laptop: the steps that led here, collapsed. Counted strips are saved,
         so they are shown done but not reopened (lib/use-steps.js). -->
    <StepList v-if="wide" class="steps-before" part="before" />

    <header class="head" data-step="count">
      <StepNumber />
      <span class="title t-label">{{ t('result.title', { n: session.strips.length }) }}</span>
      <!-- Grey, mono, with a leading `~`, and named as the app's: the person's
           count below is the answer. Only shown when the person changed
           something. Struck through until Oct 2026, which read as an error. -->
      <span v-if="checked" class="machine t-label">{{ t('result.appFound', { n: strip.machineTotal }) }}</span>
    </header>

    <div class="count-block">
      <!-- The person's count is the hero: black, unqualified, the largest thing
           on the screen. An untouched strip has no person's count, and keeps
           exactly the machine styling it had before — grey, `~`, on the scale. -->
      <div v-if="checked" class="count hero t-count-human">{{ humanCount }}</div>
      <p class="sentence t-body" :class="{ unchecked: !checked }">
        <template v-if="checked">
          {{ sentence.before }}<b>{{ t(`bands.${band.key}`).toUpperCase() }}</b>{{ sentence.after }}
        </template>
        <template v-else>{{ sentence.before }}</template>
      </p>
      <BandScale
        class="scale-block"
        :count="shownCount"
        :bands="session.bands"
        :machine="!checked"
        :show-count="!checked"
      />
      <!-- Said, not hidden: the count includes marks in parts nobody looked at
           close up. They are still blue on the thumbnail below. -->
      <!-- The test-pattern demo knows its answer, and says it: a test. -->
      <p v-if="strip.drawn !== null" class="drawn t-label">
        {{ t('result.testDrawn', { n: strip.drawn }) }}
      </p>
    </div>

    <!-- The tally is a breakdown of the person's judgments. With none made
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
        <MarkLayer :marks="strip.marks" :clumps="strip.clumps" :rect="rect" :stage="stage" />
      </ImageStage>
      <!-- Only claims a record was saved when one actually was. -->
      <div class="badges">
        <StatusBadge v-if="!checked" tone="dashed">{{ t('badge.notChecked') }}</StatusBadge>
        <StatusBadge class="saved" :tone="session.recordsPersist ? 'ink' : 'muted'">
          {{ savedBadge }}
        </StatusBadge>
      </div>
    </div>

    <!-- What will be sent, before it is: the card itself, centred and large
         enough to read, in one panel with what it is and the button that
         sends it (Oct 2026). -->
    <section class="share">
      <div class="share-panel">
        <img v-if="preview" class="share-preview" :src="preview" :alt="t('share.previewAlt')" />
        <p class="share-what t-body">{{ t('share.what') }}</p>
        <AppButton variant="secondary" class="share-button" :disabled="sharing || !preview" @click="share">
          {{ t('share.button') }}
        </AppButton>
        <p v-if="shareNote" class="share-note t-body" role="status">{{ shareNote }}</p>
      </div>
    </section>

    <!-- A demo is not tied to anything: its result ends at Home (Oct 2026). -->
    <div v-if="session.isDemo" class="footer" :class="{ ready }">
      <AppButton variant="primary" bar :disabled="!ready" @click="backHome">
        {{ t('menu.home') }}
      </AppButton>
    </div>

    <div v-else-if="quick" class="footer stack" :class="{ ready }">
      <AppButton variant="secondary" :disabled="!ready" @click="startSessionFromHere">
        {{ t('result.startSession') }}
      </AppButton>
      <AppButton variant="primary" bar :disabled="!ready" @click="countAnother">
        {{ t('result.countAnother') }}
      </AppButton>
    </div>

    <div v-else class="footer pair" :class="{ ready }">
      <AppButton variant="secondary" bar class="end" :disabled="!ready" @click="endSession">
        {{ t('result.endSession') }}
      </AppButton>
      <AppButton variant="primary" bar class="next" :disabled="!ready" @click="nextStrip">
        {{ t('result.nextStrip') }}
      </AppButton>
    </div>
  </div>
</template>

<style scoped>
.result {
  height: 100%;
  overflow-y: auto;
  background: var(--paper);
  display: flex;
  flex-direction: column;
}

.head {
  flex: none;
  display: flex;
  align-items: center;
  gap: var(--sp-12);
  padding: var(--sp-16) var(--sp-16) 0;
}
.machine {
  margin-left: auto;
  color: var(--muted);
}

.count-block {
  flex: none;
  padding: var(--sp-8) var(--sp-16) var(--sp-14);
}
.hero {
  line-height: 0.9;
}
.sentence {
  margin: var(--sp-8) 0 var(--sp-14);
}
.sentence.unchecked {
  color: var(--muted);
  margin-bottom: 0;
}
.drawn {
  margin: var(--sp-10) 0 0;
  color: var(--ink);
}
.legend {
  flex: none;
}

.thumb {
  margin: var(--sp-14) var(--sp-16);
  flex: 1;
  /* Gives way first: the share card beside the button shows the marks too, and
     the actions must stay on a phone's screen. */
  min-height: 72px;
  position: relative;
  border: var(--bd) solid var(--ink);
  border-radius: var(--r-primary);
  overflow: hidden;
}
.badges {
  position: absolute;
  right: var(--sp-10);
  bottom: var(--sp-8);
  display: flex;
  gap: var(--sp-8);
}

.share {
  flex: none;
  padding: 0 var(--sp-16) var(--sp-14);
}
.share-panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--sp-12);
  padding: var(--sp-16);
  background: var(--panel);
  border: var(--bd) solid var(--ink);
}
/* The card at 9:16, tall enough to read its count. */
.share-preview {
  display: block;
  height: 280px;
  aspect-ratio: 1080 / 1920;
  border: var(--bd) solid var(--ink);
  background: var(--paper);
}
.share-what {
  margin: 0;
  color: var(--muted);
  text-align: center;
}
.share-button {
  align-self: stretch;
}
.share-note {
  margin: 0;
  color: var(--muted);
  text-align: center;
}

/* The actions stay on screen while the page scrolls under them: the share
   panel made this page taller than a phone (Oct 2026). */
.footer {
  flex: none;
  position: sticky;
  bottom: 0;
  z-index: 1;
  background: var(--paper);
  display: flex;
  opacity: 0;
  transition: opacity 0.12s linear;
}
.footer.ready { opacity: 1; }
.footer.stack {
  flex-direction: column;
}
.footer.stack > :first-child {
  width: auto;
  margin: 0 var(--sp-16) var(--sp-14);
}
.pair .end {
  flex: 1;
  border-right-width: var(--bd);
}
.pair .next {
  flex: 1.4;
}

/* Laptop (brief §5): the count and its breakdown in the left column, the
   checked strip on the right at full height. */
.wide .result {
  /* A size container, so the strip on the right can be exactly the visible
     height while the left column scrolls past it. */
  container-type: size;
  display: grid;
  grid-template-columns: minmax(var(--device-w), var(--pane-share)) 1fr;
  grid-template-rows: auto auto auto auto 1fr auto;
}
.wide .result > .steps-before { grid-column: 1; grid-row: 1; }
.wide .result > .head { grid-column: 1; grid-row: 2; }
.wide .result > .count-block { grid-column: 1; grid-row: 3; }
.wide .result > .legend { grid-column: 1; grid-row: 4; }
.wide .result > .share { grid-column: 1; grid-row: 5; align-self: end; padding-top: var(--sp-14); }
.wide .result > .footer { grid-column: 1; grid-row: 6; }
.wide .result > .thumb {
  grid-column: 2;
  grid-row: 1 / -1;
  position: sticky;
  top: 0;
  align-self: start;
  height: 100cqh;
  margin: 0;
  border-width: 0 0 0 var(--bd);
}
</style>
