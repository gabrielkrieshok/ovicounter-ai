<script setup>
import { computed, inject, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import AppButton from '@/components/AppButton.vue'
import { preloadCv } from '@/cv/use-cv'
import MarkIntro from '@/components/MarkIntro.vue'
import StatusBadge from '@/components/StatusBadge.vue'
import { bandFor } from '@/lib/bands'
import { SESSION_HISTORY } from '@/lib/dev-fixtures'
import { demoPhoto } from '@/lib/samples'
import { t, weekday } from '@/i18n'
import { useSessionStore } from '@/stores/session'
import { useStripStore } from '@/stores/strip'

/* Welcome. Four doors: new session, count one strip, demo, history. No tab
   bar — the flow is linear, so navigation chrome went away with it.

   "Count one strip" (Sep 2026, brief §4) is the short path: photo → crop →
   marks → fix if wanted → number. No session, nothing saved unless asked. It
   is what V1 did in two steps, and the demo uses it — from Welcome the demo
   reaches a number in three decisions. */

const route = useRoute()
const router = useRouter()
const wide = inject('wideLayout', ref(false))

/* The two other demos open under the yellow button; previous sessions open
   behind their own button — neither is common yet, and both cost the doors
   their place at the top of a phone. */
const demosOpen = ref(false)
const historyOpen = ref(false)
const session = useSessionStore()
const strip = useStripStore()

/* Persistence lands in a later step, so a real device has no history yet and
   this screen shows its empty state. `#/?history` substitutes fixtures in a dev
   build so the populated layout can be checked against the handoff.
   `import.meta.env.DEV` is a compile-time constant, so the branch — and with it
   the only reference to the fixtures — is dropped from a production build. */
const sessions = computed(() => {
  if (import.meta.env.DEV && route.query.history !== undefined) return SESSION_HISTORY
  return session.previous.map((s) => ({
    id: s.id,
    day: weekday(s.startedAt),
    counts: s.counts,
    unchecked: s.unchecked ?? 0,
  }))
})

/* Start loading the 8.9MB runtime now, while the operator is reading this
   screen. Computation belongs in the transitions, and a cold module load is
   not something a transition can hide. */
onMounted(async () => {
  preloadCv()
  /* A quick count that was left mid-way is not a session: nothing to resume,
     nothing to summarise. Coming home ends it. */
  if (session.isQuick) session.end()
  await session.openStorage()
})

/* An interrupted session — the app closed, the phone died, the technician was
   called away. The strips already in it are real work, so it is offered rather
   than quietly discarded. */
async function resume() {
  if (!(await session.resume(session.resumable.id))) return
  router.push({ name: 'capture' })
}

/* Each session shows its first few bands as badges, loud bands filled. */
const BADGES_SHOWN = 6

function badges(counts) {
  return counts.slice(0, BADGES_SHOWN).map((c) => bandFor(c, session.bands))
}
function overflow(counts) {
  return Math.max(0, counts.length - BADGES_SHOWN)
}

/* The unfinished session, first in the history: its day, and which strip
   comes next. */
const resumeDay = computed(() => (session.resumable ? weekday(session.resumable.startedAt) : ''))
const resumeNext = computed(() => (session.resumable ? session.resumable.counts.length + 1 : 0))

async function startSession() {
  await session.start()
  router.push({ name: 'capture' })
}

async function countOne() {
  await session.start({ quick: true })
  router.push({ name: 'capture' })
}

/* The demo is a quick count on a bundled strip, and saves nothing. It skips
   Capture, because there is no photograph to take — the strip is already in the
   build — and lands on Crop with it in hand. */
async function startDemo(kind = 'clean') {
  await session.start({ demo: true, quick: true, demoKind: kind })
  const { url, drawn } = await demoPhoto(kind)
  strip.beginFromPhoto(url, { drawn })
  router.push({ name: 'crop' })
}
</script>

<template>
  <div class="welcome">
    <section class="doors">
      <p class="intro" :class="wide ? 't-display' : 't-body'">{{ t('app.intro') }}</p>

      <!-- On the phone the picture of the job sits under the intro; on the
           laptop it heads the right-hand column. -->
      <MarkIntro v-if="!wide" class="picture" />

      <!-- On the phone, above the doors: an interrupted session is unfinished
           work, and starting a new one on top of it loses the thread. -->
      <button v-if="session.resumable && !wide" class="resume" type="button" @click="resume">
        <span class="t-label">{{ t('welcome.resumeNext', { n: resumeNext }) }}</span>
        <span class="t-title">{{ t('welcome.resumeDay', { day: resumeDay }) }}</span>
      </button>

      <div class="actions">
        <!-- The demo first, in yellow: for now most people opening this are
             seeing what it does, not counting a strip. One tap starts the clean
             strip — the demo still reaches a number in three decisions — and
             the other two are one more tap away. -->
        <div class="demo">
          <AppButton variant="primary" @click="startDemo('clean')">
            {{ t('welcome.tryDemo') }}
          </AppButton>
          <button
            class="disclose t-label"
            type="button"
            :aria-expanded="demosOpen"
            @click="demosOpen = !demosOpen"
          >
            {{ t('welcome.otherDemos') }} <span aria-hidden="true">{{ demosOpen ? '▾' : '▸' }}</span>
          </button>
          <div v-if="demosOpen" class="choices">
            <button class="choice" type="button" @click="startDemo('field')">
              <span class="t-title">{{ t('welcome.demoField') }}</span>
              <span class="t-body note-line">{{ t('welcome.demoFieldNote') }}</span>
            </button>
            <button class="choice" type="button" @click="startDemo('pattern')">
              <span class="t-title">{{ t('welcome.demoPattern') }}</span>
              <span class="t-body note-line">{{ t('welcome.demoPatternNote') }}</span>
            </button>
          </div>
        </div>

        <div class="door">
          <AppButton variant="secondary" @click="countOne">
            {{ t('welcome.countOne') }}
          </AppButton>
          <p class="t-body note-line">{{ t('welcome.countOneNote') }}</p>
        </div>
        <div class="door">
          <AppButton variant="secondary" @click="startSession">
            {{ t('welcome.startSession') }}
          </AppButton>
          <p class="t-body note-line">{{ t('welcome.startSessionNote') }}</p>
        </div>
      </div>

      <AppButton variant="quiet" class="how" @click="router.push({ name: 'guide' })">
        {{ t('guide.open') }}
      </AppButton>

      <p class="note t-body">{{ t('welcome.demoNote') }}</p>
    </section>

    <section v-if="wide || sessions.length || session.resumable" class="history">
      <MarkIntro v-if="wide" class="picture" />

      <button v-if="session.resumable && wide" class="resume" type="button" @click="resume">
        <span class="t-label">{{ t('welcome.resumeNext', { n: resumeNext }) }}</span>
        <span class="t-title">{{ t('welcome.resumeDay', { day: resumeDay }) }}</span>
      </button>

      <template v-if="sessions.length">
        <button
          class="disclose history-toggle t-title"
          type="button"
          :aria-expanded="historyOpen"
          @click="historyOpen = !historyOpen"
        >
          <span>{{ t('welcome.previousSessions') }} · {{ sessions.length }}</span>
          <span aria-hidden="true">{{ historyOpen ? '▾' : '▸' }}</span>
        </button>

        <ul v-if="historyOpen" class="rows">
          <li v-for="s in sessions" :key="s.id" class="row">
            <div class="what">
              <span class="day t-title">{{ s.day }}</span>
              <span class="meta">
                <span class="t-label strips">{{ t('welcome.stripCount', { n: s.counts.length }) }}</span>
                <StatusBadge v-if="s.unchecked" tone="dashed">
                  {{ t('badge.notCheckedCount', { n: s.unchecked }) }}
                </StatusBadge>
              </span>
            </div>
            <div class="badges">
              <StatusBadge
                v-for="(band, j) in badges(s.counts)"
                :key="j"
                :tone="band.heavyweight ? 'filled' : 'muted'"
              >{{ band.letter }}</StatusBadge>
              <span v-if="overflow(s.counts)" class="t-label more">+{{ overflow(s.counts) }}</span>
            </div>
          </li>
        </ul>
      </template>
    </section>
  </div>
</template>

<style scoped>
.welcome {
  height: 100%;
  overflow-y: auto;
  background: var(--paper);
  display: flex;
  flex-direction: column;
}

.doors {
  display: flex;
  flex-direction: column;
  padding: var(--sp-16);
  gap: var(--sp-16);
}
.intro {
  margin: 0;
}

.actions {
  display: flex;
  flex-direction: column;
  gap: var(--sp-14);
}

.demo {
  display: flex;
  flex-direction: column;
}
/* A disclosure, not a button that does something: ink text in a 44px row. */
.disclose {
  min-height: var(--hit-min);
  display: flex;
  align-items: center;
  gap: var(--sp-8);
  color: var(--ink);
  text-align: left;
}
.choices {
  display: flex;
  flex-direction: column;
  border: var(--bd) solid var(--ink);
}
.choice {
  min-height: var(--hit-secondary);
  padding: var(--sp-10) var(--sp-14);
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  text-align: left;
  background: var(--paper);
  color: var(--ink);
}
.choice + .choice {
  border-top: var(--bd-inner) solid var(--ink);
}
.choice:active {
  background: var(--panel);
}

/* Each door with one line under it, so Count one strip and Start a new
   session read as two different things rather than two of the same button. */
.door {
  display: flex;
  flex-direction: column;
  gap: var(--sp-5);
}
.note-line {
  margin: 0;
  color: var(--muted);
}

.resume {
  width: 100%;
  min-height: var(--hit-primary);
  padding: var(--sp-10) var(--sp-16);
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  gap: 4px;
  text-align: left;
  border: var(--bd) solid var(--ink);
  background: var(--paper);
  color: var(--ink);
}

.note {
  margin: 0;
  color: var(--muted);
}

.history {
  padding: 0 var(--sp-16) var(--sp-22);
  display: flex;
  flex-direction: column;
  gap: var(--sp-12);
}
.history-toggle {
  justify-content: space-between;
  border-top: var(--bd) solid var(--ink);
  border-bottom: var(--bd) solid var(--ink);
}
.rows {
  list-style: none;
  margin: calc(-1 * var(--sp-12)) 0 0;
  padding: 0;
}
.row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sp-12);
  min-height: var(--hit-primary);
  padding: var(--sp-10) 0;
  border-bottom: var(--bd-inner) solid var(--ink);
}
.what {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}
.meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--sp-8);
}
.strips,
.more {
  color: var(--muted);
}
.badges {
  flex: none;
  display: flex;
  align-items: center;
  gap: 4px;
}

/* Laptop: two columns — the intro at display size and the doors on the left;
   on the right, on panel, the picture of the job, any unfinished session, and
   previous sessions behind their button. */
.wide .welcome {
  display: grid;
  grid-template-columns: 1fr 1fr;
  overflow: hidden;
}
.wide .doors {
  padding: 40px 56px var(--sp-22);
  gap: var(--sp-16);
  overflow-y: auto;
}
.wide .note {
  margin-top: auto;
}
.wide .history {
  background: var(--panel);
  border-left: var(--bd) solid var(--ink);
  padding: 56px;
  gap: var(--sp-22);
  overflow-y: auto;
}
.wide .picture {
  max-width: 560px;
}
</style>
