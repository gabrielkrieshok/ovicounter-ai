<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import ImageStage from '@/components/ImageStage.vue'
import MarkLayer from '@/components/MarkLayer.vue'
import { t } from '@/i18n'
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
 */

const route = useRoute()
const router = useRouter()
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

onMounted(async () => {
  if (!strip.working) {
    router.replace({ name: 'welcome' })
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
    <header class="head">
      <h1 class="title">{{ t('processing.title') }}</h1>
      <div class="track">
        <span class="fill" :style="{ width: `${progress}%` }" />
      </div>
    </header>

    <div class="stage-wrap">
      <ImageStage :src="shown" fit="contain" background="var(--ink)" v-slot="{ rect, stage }">
        <MarkLayer :marks="marks" :boxes="boxes" :rect="rect" :stage="stage" />
      </ImageStage>
      <span class="buffer-badge mono">{{ currentBadge }}</span>
    </div>

    <div class="rail">
      <div
        v-for="(step, i) in STEPS"
        :key="step.key"
        class="rail-step"
        :class="{ current: i === stepIndex }"
      >
        <div class="thumb">
          <span v-if="step.key === 'lightDark'" class="histogram">
            <i style="height: 30%" /><i style="height: 85%" /><i style="height: 60%" /><i style="height: 15%" />
          </span>
          <span v-else-if="step.key === 'boxes'" class="mini-box" />
          <span v-else-if="step.key === 'marks'" class="mini-ring" />
        </div>
        <div class="rail-label mono">
          {{ t(step.label) }}<template v-if="i === stepIndex"> ◀</template>
        </div>
      </div>
    </div>
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
  padding: 18px 20px var(--sp-12);
}
.title {
  margin: 0;
  font: 700 17px var(--font-sans);
  color: var(--paper);
}
.track {
  margin-top: var(--sp-10);
  height: 6px;
  background: var(--ink-soft);
  border-radius: 3px;
  overflow: hidden;
}
.fill {
  display: block;
  height: 100%;
  background: var(--paper);
  border-radius: 3px;
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
  font: 600 11px var(--font-mono);
  background: var(--scrim);
  color: var(--cyan);
  border-radius: var(--r-badge);
  padding: 4px 8px;
}

.rail {
  display: flex;
  gap: var(--sp-8);
  padding: var(--sp-14) var(--sp-16) 18px;
}
.rail-step {
  flex: 1;
  text-align: center;
}
.thumb {
  height: 52px;
  border: var(--bd-fine) solid var(--ink-soft);
  border-radius: var(--r-small);
  background: var(--stage-bg);
  display: flex;
  align-items: center;
  justify-content: center;
}
.current .thumb {
  border-color: var(--amber);
}
.rail-label {
  margin-top: 5px;
  font: 500 10px var(--font-mono);
  color: var(--disabled);
}
.current .rail-label {
  font-weight: 600;
  color: var(--amber);
}

.histogram {
  width: 100%;
  height: 100%;
  padding: 6px;
  display: flex;
  align-items: flex-end;
  gap: 2px;
  box-sizing: border-box;
  background: var(--panel);
  border-radius: var(--r-small);
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

/* Laptop: the buffer left at full height, title and progress top-right, the
   step rail bottom-right. */
.wide .processing {
  display: grid;
  grid-template-columns: 1fr minmax(var(--device-w), var(--pane-share));
  grid-template-rows: auto 1fr auto;
}
.wide .processing > .head {
  grid-column: 2;
  grid-row: 1;
}
.wide .processing > .stage-wrap {
  grid-column: 1;
  grid-row: 1 / -1;
}
.wide .processing > .rail {
  grid-column: 2;
  grid-row: 3;
}
</style>
