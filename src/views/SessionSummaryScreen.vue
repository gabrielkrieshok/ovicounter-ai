<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import AppButton from '@/components/AppButton.vue'
import StripHeader from '@/components/StripHeader.vue'
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
    <StripHeader class="head" :title="t('summary.title')">
      <p v-if="finished" class="meta t-label">
        {{ t('summary.meta', { day, minutes: finished.minutes }) }}
      </p>
    </StripHeader>

    <div class="figures" v-if="finished">
      <div class="figure">
        <span class="value t-tally">{{ finished.counts.length }}</span>
        <span class="caption t-title">{{ t('summary.stripsCounted') }}</span>
      </div>
      <div class="figure">
        <span class="value t-tally">{{ finished.refusals }}</span>
        <span class="caption t-title">{{ t('summary.retakesAsked') }}</span>
      </div>
    </div>

    <div class="bands">
      <div class="bands-label t-label">{{ t('summary.bands') }}</div>
      <div class="rows">
        <div v-for="row in histogram" :key="row.band.key" class="row">
          <span class="name t-label">{{ t(`bands.${row.band.key}`) }}</span>
          <!-- A bar, so the shape of the route is readable without reading the
               numbers — the same reason the history cards on Welcome use filled
               and outlined badges. -->
          <span class="meter">
            <span
              class="fill"
              :class="{ loud: row.band.heavyweight }"
              :style="{
                width: `${finished && finished.counts.length ? (row.count / finished.counts.length) * 100 : 0}%`,
              }"
            />
          </span>
          <span class="tally t-label">{{ row.count }}</span>
        </div>
      </div>
    </div>

    <p class="saved t-body">
      <template v-if="finished?.wasDemo">{{ t('summary.demoNotSaved') }}</template>
      <template v-else>✓ {{ t('summary.saved') }}</template>
    </p>

    <div class="footer">
      <AppButton variant="primary" bar @click="backHome">
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

.meta {
  margin: 0;
  color: var(--muted);
}

.figures {
  display: flex;
  border-bottom: var(--bd) solid var(--ink);
}
.figure {
  flex: 1;
  padding: var(--sp-14) var(--sp-16);
  display: flex;
  flex-direction: column;
  gap: var(--sp-5);
}
.figure + .figure {
  border-left: var(--bd) solid var(--ink);
}

.bands {
  padding: var(--sp-22) var(--sp-16) 0;
}
.bands-label {
  color: var(--ink);
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
  width: 64px;
}
/* Not `.bar`: that is AppButton's class for a flush action bar, and a rule
   here by that name would style the Back to home button as a meter. */
.meter {
  flex: 1;
  height: 16px;
  background: var(--panel);
  border: var(--bd-inner) solid var(--ink);
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
  width: 28px;
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.saved {
  margin: auto 0 0;
  padding: var(--sp-16);
  color: var(--muted);
}

.footer {
  flex: none;
}

/* Laptop: a readable column, as on Welcome, ruled at its sides. */
.wide .summary {
  width: 100%;
  max-width: 560px;
  margin: 0 auto;
  border-left: var(--bd) solid var(--ink);
  border-right: var(--bd) solid var(--ink);
}
</style>
