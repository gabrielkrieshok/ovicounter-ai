<script setup>
import { computed, inject, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'

import { preloadCv } from '@/cv/use-cv'
import MarkIntro from '@/components/MarkIntro.vue'
import StatusBadge from '@/components/StatusBadge.vue'
import WelcomeDoors from '@/components/WelcomeDoors.vue'
import { bandFor } from '@/lib/bands'
import { SESSION_HISTORY } from '@/lib/dev-fixtures'
import { t, weekday } from '@/i18n'
import { useSessionStore } from '@/stores/session'

/* Welcome: what this is, and the ways in.

   The intro and the picture of the job say what the tool does; the doors
   (components/WelcomeDoors.vue) are what to do about it — under the picture on
   a phone, in the right-hand column on a laptop, where previous sessions wait
   behind their own button. */

const route = useRoute()
const wide = inject('wideLayout', ref(false))

/* Previous sessions open behind their own button: not common yet, and the
   list would cost the doors their place. */
const historyOpen = ref(false)
const session = useSessionStore()

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

/* Each session shows its first few bands as badges, loud bands filled. */
const BADGES_SHOWN = 6

function badges(counts) {
  return counts.slice(0, BADGES_SHOWN).map((c) => bandFor(c, session.bands))
}
function overflow(counts) {
  return Math.max(0, counts.length - BADGES_SHOWN)
}

</script>

<template>
  <div class="welcome">
    <section class="doors">
      <!-- The first thing anyone reads: in the display face on the phone as
           well as the laptop. -->
      <p class="intro t-display">{{ t('app.intro') }}</p>

      <!-- The picture of the job, right under the words it illustrates. -->
      <MarkIntro class="picture" />

      <!-- Phone: the doors under the picture. Laptop: they head the right-hand
           column (below). -->
      <WelcomeDoors v-if="!wide" />
    </section>

    <section v-if="wide || sessions.length" class="history">
      <WelcomeDoors v-if="wide" />

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

.history {
  padding: 0 var(--sp-16) var(--sp-22);
  display: flex;
  flex-direction: column;
  gap: var(--sp-12);
}
.disclose {
  min-height: var(--hit-min);
  display: flex;
  align-items: center;
  gap: var(--sp-8);
  color: var(--ink);
  text-align: left;
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

/* Laptop: two columns — the intro at display size, the picture of the job
   and the doors on the left; on the right, on panel, any unfinished session
   and previous sessions behind their button. */
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
