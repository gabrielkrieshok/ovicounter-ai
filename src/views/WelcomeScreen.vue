<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import AppButton from '@/components/AppButton.vue'
import AppMenu from '@/components/AppMenu.vue'
import AppWordmark from '@/components/AppWordmark.vue'
import { preloadCv } from '@/cv/use-cv'
import BandBadge from '@/components/BandBadge.vue'
import { bandFor } from '@/lib/bands'
import { SESSION_HISTORY } from '@/lib/dev-fixtures'
import { DEMO_PHOTO } from '@/lib/samples'
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
const menuOpen = ref(false)
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

/* The most recent session shows its bands as badges; older ones collapse to a
   muted letter run, so the eye lands on the session just finished. */
const BADGES_SHOWN = 6

function badges(counts) {
  return counts.slice(0, BADGES_SHOWN).map((c) => bandFor(c, session.bands))
}
function overflow(counts) {
  return Math.max(0, counts.length - BADGES_SHOWN)
}
function letterRun(counts) {
  const shown = counts.slice(0, 8).map((c) => bandFor(c, session.bands).letter)
  return counts.length > 8 ? `${shown.join(' ')} …` : shown.join(' ')
}

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
async function startDemo() {
  await session.start({ demo: true, quick: true })
  strip.beginFromPhoto(DEMO_PHOTO)
  router.push({ name: 'crop' })
}
</script>

<template>
  <div class="welcome">
    <header class="head">
      <div class="lockup">
        <!-- 16, not the 20 the frame was first built with: at 20 the row
             needs 370px in a 336px header and the menu button was clipped. -->
        <AppWordmark :size="16" />
        <span class="offline mono">{{ t('app.offline') }}</span>
        <!-- Welcome has no app bar — it is already home — so the menu is
             reachable from its own header instead. -->
        <button
          class="burger"
          type="button"
          :aria-label="t('menu.open')"
          :aria-expanded="menuOpen"
          @click="menuOpen = true"
        >
          <span /><span /><span />
        </button>
      </div>
      <p class="intro">{{ t('app.intro') }}</p>
    </header>

    <div class="actions">
      <!-- Above the other two: an interrupted session is unfinished work, and
           starting a new one on top of it loses the thread. -->
      <button v-if="session.resumable" class="resume" type="button" @click="resume">
        <span class="resume-action">{{ t('welcome.resumeAction') }}</span>
        <span class="resume-status mono">
          {{ t('welcome.resumeStatus', { done: session.resumable.counts.length }) }}
        </span>
      </button>

      <AppButton variant="filled" :size="62" :font="18" @click="startSession">
        {{ t('welcome.startSession') }}
      </AppButton>
      <AppButton variant="outline" :size="52" :font="16" @click="countOne">
        {{ t('welcome.countOne') }}
      </AppButton>
      <AppButton variant="outline" :size="52" :font="16" @click="startDemo">
        {{ t('welcome.tryDemo') }}
      </AppButton>
    </div>

    <!-- A first-time device has no history to show, and the mark language is
         the one thing in this tool that has to be learned. Teaching it here
         costs a returning operator nothing, because from their second session
         on this space is their own sessions. -->
    <section v-if="!sessions.length" class="legend">
      <h2 class="section">{{ t('welcome.marksTitle') }}</h2>
      <ul class="marks">
        <li><span class="glyph ring proposed" />{{ t('welcome.marksProposed') }}</li>
        <li><span class="glyph ring kept" />{{ t('welcome.marksKept') }}</li>
        <li><span class="glyph removed">✕</span>{{ t('welcome.marksRemoved') }}</li>
        <li><span class="glyph added">+</span>{{ t('welcome.marksAdded') }}</li>
      </ul>
    </section>

    <template v-if="sessions.length">
      <h2 class="section">{{ t('welcome.previousSessions') }}</h2>

      <ul class="cards">
        <li
          v-for="(s, i) in sessions"
          :key="s.id"
          class="card"
          :class="{ older: i > 0 }"
        >
          <div class="card-row">
            <span class="day">{{ s.day }}</span>
            <span class="strips mono">{{ t('welcome.stripCount', { n: s.counts.length }) }}</span>
          </div>

          <div v-if="i === 0" class="badges">
            <BandBadge
              v-for="(band, j) in badges(s.counts)"
              :key="j"
              :letter="band.letter"
              :filled="band.heavyweight"
            />
            <span v-if="overflow(s.counts)" class="more mono">+{{ overflow(s.counts) }}</span>
          </div>
          <div v-else class="run mono">{{ letterRun(s.counts) }}</div>
        </li>
      </ul>
    </template>

    <p class="note">{{ t('welcome.demoNote') }}</p>

    <AppMenu :open="menuOpen" @close="menuOpen = false" />
  </div>
</template>

<style scoped>
.welcome {
  height: 100%;
  background: var(--paper);
  display: flex;
  flex-direction: column;
}

.head {
  padding: 26px 20px 18px;
}
.lockup {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--sp-10);
}
.intro {
  margin: var(--sp-14) 0 0;
  font: 400 15px var(--font-sans);
  color: var(--ink-soft);
  line-height: 1.45;
}
.burger {
  flex: none;
  width: var(--hit-min);
  height: var(--hit-min);
  margin-right: -10px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
}
.burger span {
  width: 20px;
  height: 2px;
  background: var(--ink);
  border-radius: 1px;
}

.offline {
  flex: none;
  font: 600 11px var(--font-mono);
  color: var(--muted);
  border: var(--bd-fine) solid var(--rule-idle);
  border-radius: var(--r-badge);
  padding: 4px 8px;
}

.actions {
  padding: 0 var(--sp-16);
  display: flex;
  flex-direction: column;
  gap: var(--sp-10);
}

.resume {
  min-height: var(--hit-primary);
  padding: var(--sp-12) var(--sp-14);
  border: var(--bd) solid var(--ink);
  border-radius: var(--r-primary);
  background: var(--panel);
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  text-align: left;
}
.resume-action {
  font: 700 17px var(--font-sans);
}
.resume-status {
  font: 500 12px var(--font-mono);
  color: var(--muted);
}

.section {
  padding: 26px 20px var(--sp-10);
  margin: 0;
  font: 600 13px var(--font-sans);
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.marks {
  list-style: none;
  margin: 0;
  padding: 0 20px;
  display: flex;
  flex-direction: column;
  gap: var(--sp-10);
}
.marks li {
  display: flex;
  align-items: center;
  gap: var(--sp-12);
  font: 400 14px var(--font-sans);
  color: var(--ink-soft);
}
/* The same shapes and colours the marks themselves use — shape carrying the
   meaning redundantly with colour, exactly as on the strip. */
.glyph {
  flex: none;
  width: 18px;
  display: grid;
  place-items: center;
  font: 700 16px var(--font-sans);
}
.glyph.ring {
  height: 14px;
  width: 14px;
  margin: 0 2px;
  border-radius: 50%;
}
.glyph.proposed { border: 2.5px dashed var(--blue); }
.glyph.kept { border: 2.5px solid var(--green); }
.glyph.removed { color: var(--red); }
.glyph.added { color: var(--pink); }

.cards {
  padding: 0 var(--sp-16);
  margin: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: var(--sp-8);
}
.card {
  border: var(--bd) solid var(--ink);
  border-radius: var(--r-panel);
  padding: var(--sp-12) var(--sp-14);
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.card.older { border-color: var(--rule-idle); }

.card-row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}
.day { font: 600 15px var(--font-sans); }
.older .day { color: var(--ink-soft); }
.strips {
  font: 500 13px var(--font-mono);
  color: var(--muted);
}

.badges {
  display: flex;
  gap: 3px;
  align-items: center;
}
.more {
  font: 500 11px var(--font-mono);
  color: var(--disabled);
  padding: 2px 0;
}
.run {
  font: 500 12px var(--font-mono);
  color: var(--disabled);
}

/* Laptop: no stage to split around, so the phone layout stands in a column
   that a laptop can read — buttons and paragraphs do not want 1400px. */
.wide .welcome {
  width: 100%;
  max-width: 560px;
  margin: 0 auto;
}

.note {
  margin: auto 0 0;
  padding: var(--sp-16) 20px var(--sp-22);
  font: 400 13px var(--font-sans);
  color: var(--muted);
  line-height: 1.45;
  border-top: var(--bd) solid var(--panel);
}
</style>
