<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import AppButton from '@/components/AppButton.vue'
import { bandHistogram } from '@/lib/bands'
import { t, weekday } from '@/i18n'
import { useSessionStore } from '@/stores/session'
import { useStripStore } from '@/stores/strip'

/* The session's receipt.
 *
 * Counts, bands, retakes, and an explicit statement about where the record
 * went. This is the only screen that reports on the sitting rather than on a
 * strip, and the only one that mentions retakes — a refused photograph never
 * advanced the strip counter and never entered the record, so this is where it
 * becomes visible at all.
 *
 * Lo-fi only: wireframe 2j. Every string here is DRAFT.
 */

const router = useRouter()
const session = useSessionStore()
const strip = useStripStore()

/* `end()` clears the active session, so read from what it returned. Ending the
   session is the point of arriving here — doing it on mount means the back
   button cannot leave a half-ended session behind. */
const finished = ref(null)

onMounted(() => {
  finished.value = session.isActive ? session.end() : session.lastFinished
  strip.$reset()
})

const histogram = computed(() =>
  finished.value ? bandHistogram(finished.value.counts, session.bands) : [],
)

const day = computed(() =>
  finished.value ? weekday(finished.value.startedAt) : '',
)

function backHome() {
  router.push({ name: 'welcome' })
}
</script>

<template>
  <div class="summary">
    <header class="head">
      <h1 class="title">{{ t('summary.title') }}</h1>
      <p class="meta mono" v-if="finished">
        {{ t('summary.meta', { day, minutes: finished.minutes }) }}
      </p>
    </header>

    <div class="figures" v-if="finished">
      <div class="figure">
        <span class="value mono">{{ finished.counts.length }}</span>
        <span class="caption">{{ t('summary.stripsCounted') }}</span>
      </div>
      <div class="figure">
        <span class="value mono">{{ finished.refusals }}</span>
        <span class="caption">{{ t('summary.retakesAsked') }}</span>
      </div>
    </div>

    <div class="bands">
      <div class="bands-label">{{ t('summary.bands') }}</div>
      <div class="rows">
        <div v-for="row in histogram" :key="row.band.key" class="row">
          <span class="name">{{ t(`bands.${row.band.key}`) }}</span>
          <!-- A bar, so the shape of the route is readable without reading the
               numbers — the same reason the history cards on Welcome use filled
               and outlined badges. -->
          <span class="bar">
            <span
              class="fill"
              :class="{ loud: row.band.heavyweight }"
              :style="{
                width: `${finished && finished.counts.length ? (row.count / finished.counts.length) * 100 : 0}%`,
              }"
            />
          </span>
          <span class="tally mono">{{ row.count }}</span>
        </div>
      </div>
    </div>

    <p class="saved">
      <template v-if="finished?.wasDemo">{{ t('summary.demoNotSaved') }}</template>
      <template v-else>✓ {{ t('summary.saved') }}</template>
    </p>

    <div class="footer">
      <AppButton variant="filled" :size="62" :font="18" @click="backHome">
        {{ t('summary.backHome') }}
      </AppButton>
    </div>
  </div>
</template>

<style scoped>
.summary {
  height: 100%;
  background: var(--paper);
  display: flex;
  flex-direction: column;
}

.head {
  padding: 26px 20px var(--sp-16);
}
.title {
  margin: 0;
  font: 800 26px var(--font-sans);
  letter-spacing: -0.02em;
}
.meta {
  margin: 6px 0 0;
  font: 500 13px var(--font-mono);
  color: var(--muted);
}

.figures {
  display: flex;
  gap: var(--sp-10);
  padding: 0 var(--sp-16);
}
.figure {
  flex: 1;
  border: var(--bd) solid var(--ink);
  border-radius: var(--r-panel);
  padding: var(--sp-14);
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.value {
  font: 700 32px var(--font-mono);
  font-variant-numeric: tabular-nums;
  line-height: 1;
}
.caption {
  font: 500 13px var(--font-sans);
  color: var(--muted);
}

.bands {
  padding: var(--sp-22) 20px 0;
}
.bands-label {
  font: 600 13px var(--font-sans);
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin-bottom: var(--sp-10);
}
.rows {
  display: flex;
  flex-direction: column;
  gap: var(--sp-8);
}
.row {
  display: flex;
  align-items: center;
  gap: var(--sp-10);
}
.name {
  width: 56px;
  font: 500 14px var(--font-sans);
}
.bar {
  flex: 1;
  height: 14px;
  background: var(--panel);
  border: var(--bd-fine) solid var(--rule-idle);
  border-radius: 4px;
  overflow: hidden;
}
.fill {
  display: block;
  height: 100%;
  background: var(--rule-idle);
}
.fill.loud {
  background: var(--ink);
}
.tally {
  width: 22px;
  text-align: right;
  font: 600 14px var(--font-mono);
  font-variant-numeric: tabular-nums;
}

.saved {
  margin: auto 0 0;
  padding: var(--sp-16) 20px;
  font: 400 13px var(--font-sans);
  color: var(--muted);
  line-height: 1.45;
  border-top: var(--bd) solid var(--panel);
}

.footer {
  padding: 0 var(--sp-16) var(--sp-22);
}

/* Laptop: a readable column, as on Welcome. */
.wide .summary {
  width: 100%;
  max-width: 560px;
  margin: 0 auto;
}
</style>
