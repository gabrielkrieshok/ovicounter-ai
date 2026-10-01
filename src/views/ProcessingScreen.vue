<script setup>
import { computed, inject, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import AppButton from '@/components/AppButton.vue'
import ImageStage from '@/components/ImageStage.vue'
import MarkLayer from '@/components/MarkLayer.vue'
import StepList from '@/components/StepList.vue'
import StepNumber from '@/components/StepNumber.vue'
import { t } from '@/i18n'
import { STEPS as STRIP_STEPS } from '@/lib/steps'
import { useSessionStore } from '@/stores/session'
import { useStripStore } from '@/stores/strip'

/* Processing — the scan, made watchable.
 *
 * Every buffer shown here is a real pipeline buffer. The light/dark view is the
 * photograph with its paper estimated and subtracted; the dark specks are the
 * actual binary mask the cutoff produced; the boxes and marks are drawn from
 * the actual detections. Nothing here is a CSS filter standing in for a step
 * that did not run.
 *
 * The one presentational liberty, stated plainly because it is the kind of
 * thing that becomes a lie if left unsaid: the scan finishes in roughly 50–250ms
 * and each step is HELD for a readable beat afterwards. The work is real and
 * already done; the pacing exists so a person can watch it. Nothing is
 * animated that did not happen, and no step is shown before the buffer behind
 * it exists.
 *
 * LOOKING BACK (`?look=1`, Oct 2026). Reopened from the step list, the screen
 * does not scan: it runs the pipeline once more with the settings in hand for
 * its pictures alone (strip.inspect), leaves every mark and fix as it was, and
 * lets the person step through the four pictures themselves. The title says
 * what it is showing — how the marks were found — not that it is measuring.
 */

const route = useRoute()
const router = useRouter()
const wide = inject('wideLayout', ref(false))
const session = useSessionStore()
const strip = useStripStore()

/* Long enough to register as a step, short enough that four of them do not
   become a wait. */
const STEP_HOLD_MS = 500

const STEPS = [
  { key: 'lightDark', label: 'processing.stepLightDark', badge: 'processing.badgeLightDark' },
  { key: 'darkSpecks', label: 'processing.stepDarkSpecks', badge: 'processing.badgeDarkSpecks' },
  { key: 'boxes', label: 'processing.stepBoxes', badge: 'processing.badgeBoxes' },
  { key: 'marks', label: 'processing.stepMarks', badge: 'processing.badgeMarks' },
]

const stepIndex = ref(0)
const shown = ref(null)
const boxes = ref([])
const marks = ref([])

const progress = computed(() => ((stepIndex.value + 1) / STEPS.length) * 100)
const currentBadge = computed(() => t(STEPS[stepIndex.value].badge))

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const looking = computed(() => route.query.look === '1' && strip.marks.length > 0)
let inspected = null

/* Show one of the four pictures, in look mode. */
function show(index) {
  if (!inspected) return
  stepIndex.value = index
  const key = STEPS[index].key
  if (key === 'lightDark' || key === 'darkSpecks') {
    shown.value = inspected.buffers[key] ?? strip.working.canvas
    boxes.value = []
    marks.value = []
  } else if (key === 'boxes') {
    shown.value = inspected.buffers.lightDark ?? strip.working.canvas
    boxes.value = inspected.detections
    marks.value = []
  } else {
    shown.value = strip.working.canvas
    boxes.value = []
    marks.value = strip.marks
  }
}

/* Back to the furthest step reached — where the person was before looking. */
const backTo = computed(() => STRIP_STEPS.find((s) => s.key === strip.furthest && s.key !== 'measure') ?? STRIP_STEPS[4])
function goBack() {
  router.push({ name: backTo.value.route })
}

onMounted(async () => {
  if (!strip.working) {
    router.replace({ name: 'welcome' })
    return
  }

  if (looking.value) {
    inspected = await strip.inspect()
    show(0)
    return
  }

  const buffers = {}
  const result = await strip.scan({
    wantStages: true,
    onStage: (stage, bitmap) => {
      buffers[stage] = bitmap
    },
  })

  // 1–2: the real intermediate buffers, in the order the pipeline made them.
  for (const [index, key] of ['lightDark', 'darkSpecks'].entries()) {
    stepIndex.value = index
    if (buffers[key]) shown.value = buffers[key]
    await wait(STEP_HOLD_MS)
  }

  // 3: what the scan boxed, over the buffer it boxed it on.
  stepIndex.value = 2
  shown.value = buffers.lightDark ?? strip.working.canvas
  boxes.value = result.detections
  await wait(STEP_HOLD_MS)

  // 4: the marks, over the photograph itself.
  stepIndex.value = 3
  shown.value = strip.working.canvas
  boxes.value = []
  marks.value = strip.marks
  await wait(STEP_HOLD_MS)

  /* A quick count goes straight to the marks; the sliders are one link away
     on Your fixes for anyone who wants them. A session tunes first. A
     correction made from Refine goes back to Refine (`?then=refine`). */
  const next = route.query.then === 'refine' ? 'refine' : session.isQuick ? 'fixes' : 'refine'
  router.replace({ name: next })
})
</script>

<template>
  <div class="processing">
    <!-- Laptop: the finished steps, collapsed, above this one (StepList). -->
    <StepList v-if="wide" class="steps-before" part="before" />

    <header class="head" data-step="measure">
      <div class="title-row">
        <StepNumber />
        <h1 class="title t-display">{{ t(looking ? 'processing.lookTitle' : 'processing.title') }}</h1>
      </div>
      <p v-if="looking" class="look-hint t-body">{{ t('processing.lookHint') }}</p>
      <div v-else class="track">
        <span class="fill" :style="{ width: `${progress}%` }" />
      </div>
    </header>

    <div class="stage-wrap">
      <ImageStage :src="shown" fit="contain" background="var(--ink)" v-slot="{ rect, stage }">
        <MarkLayer :marks="marks" :boxes="boxes" :rect="rect" :stage="stage" />
      </ImageStage>
      <span class="buffer-badge t-label">{{ currentBadge }}</span>
    </div>

    <div class="rail">
      <component
        :is="looking ? 'button' : 'div'"
        v-for="(step, i) in STEPS"
        :key="step.key"
        class="rail-step"
        :class="{ current: i === stepIndex, pickable: looking }"
        :type="looking ? 'button' : undefined"
        @click="looking && show(i)"
      >
        <div class="thumb">
          <span v-if="step.key === 'lightDark'" class="histogram">
            <i style="height: 30%" /><i style="height: 85%" /><i style="height: 60%" /><i style="height: 15%" />
          </span>
          <span v-else-if="step.key === 'boxes'" class="mini-box" />
          <span v-else-if="step.key === 'marks'" class="mini-ring" />
        </div>
        <div class="rail-label t-label">
          {{ t(step.label) }}<template v-if="i === stepIndex"> ◀</template>
        </div>
      </component>
    </div>

    <div v-if="looking" class="footer">
      <AppButton variant="primary" bar @click="goBack">
        {{ t('steps.backTo', { step: t(`steps.${backTo.key}`) }) }}
      </AppButton>
    </div>

    <!-- Laptop: the steps still to come, below this one's actions. -->
    <StepList v-if="wide" class="steps-after" part="after" />
  </div>
</template>

<style scoped>
.processing {
  height: 100%;
  background: var(--ink);
  display: flex;
  flex-direction: column;
}

.head {
  flex: none;
  padding: var(--sp-16);
}
.title-row {
  display: flex;
  align-items: flex-start;
  gap: var(--sp-12);
}
.title {
  flex: 1;
  margin: 0;
  color: var(--paper);
}
.track {
  margin-top: var(--sp-12);
  height: 10px;
  border: var(--bd-inner) solid var(--paper);
}
.fill {
  display: block;
  height: 100%;
  background: var(--paper);
  /* 0.12s, driven by real step completion — never a timer pretending to be one. */
  transition: width 0.12s linear;
}

.stage-wrap {
  flex: 1;
  position: relative;
  min-height: 0;
}
.buffer-badge {
  position: absolute;
  right: var(--sp-12);
  top: var(--sp-12);
  background: var(--ink);
  color: var(--paper);
  border: var(--bd-fine) solid var(--paper);
  padding: 4px 8px;
}

.rail {
  flex: none;
  display: flex;
  gap: var(--sp-8);
  padding: var(--sp-14) var(--sp-16) 18px;
}
.rail-step {
  flex: 1;
  color: inherit;
  min-width: 0;
  text-align: center;
}
.thumb {
  height: 52px;
  border: var(--bd-inner) solid var(--rule-idle);
  border-radius: var(--r-small);
  background: var(--stage-bg);
  display: flex;
  align-items: center;
  justify-content: center;
}
/* The step running now is marked in --action — "you / here / go" — which is
   the one thing yellow means besides the primary bar. */
.current .thumb {
  border: var(--bd) solid var(--action);
}
.rail-label {
  margin-top: var(--sp-5);
  color: var(--disabled);
  overflow-wrap: anywhere;
}
.current .rail-label {
  color: var(--action);
}

.rail-step.pickable {
  min-height: var(--hit-min);
  cursor: pointer;
}
.look-hint {
  margin: var(--sp-8) 0 0;
  color: var(--paper);
}
.footer {
  flex: none;
}

.histogram {
  width: 100%;
  height: 100%;
  padding: 6px;
  display: flex;
  align-items: flex-end;
  gap: 2px;
  background: var(--panel);
}
.histogram i {
  flex: 1;
  background: var(--muted);
}
.mini-box {
  width: 16px;
  height: 10px;
  border: var(--bd-fine) solid var(--cyan);
}
.mini-ring {
  width: 13px;
  height: 13px;
  border: 2.5px dashed var(--blue);
  border-radius: 50%;
}

/* Laptop (brief §5): title, progress and the step rail on the left; the
   buffer on the right at full height. */
.wide .processing {
  display: grid;
  grid-template-columns: minmax(var(--device-w), var(--pane-share)) 1fr;
  grid-template-rows: auto auto 1fr auto auto auto;
}
.wide .processing > .head { grid-column: 1; grid-row: 2; }
.wide .processing > .rail { grid-column: 1; grid-row: 4; }
.wide .processing > .footer { grid-column: 1; grid-row: 5; }
.wide .processing > .stage-wrap {
  grid-column: 2;
  grid-row: 1 / -1;
  border-left: var(--bd) solid var(--paper);
}
.wide .processing > .steps-before { grid-column: 1; grid-row: 1; }
.wide .processing > .steps-after { grid-column: 1; grid-row: -2; }
</style>
