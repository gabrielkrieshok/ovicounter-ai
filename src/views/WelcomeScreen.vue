<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'

import { preloadCv } from '@/cv/use-cv'
import MarkIntro from '@/components/MarkIntro.vue'
import StatusBadge from '@/components/StatusBadge.vue'
import WelcomeDoors from '@/components/WelcomeDoors.vue'
import { bandFor } from '@/lib/bands'
import { SESSION_HISTORY } from '@/lib/dev-fixtures'
import { t, weekday } from '@/i18n'
import { confirm } from '@/lib/confirm'
import { useSessionStore } from '@/stores/session'

/* Welcome: what this is, and the ways in.

   The intro and the picture of the job say what the tool does; the doors
   (components/WelcomeDoors.vue) are what to do about it — under the picture on
   a phone, in the right-hand column on a laptop, where previous sessions wait
   behind their own button. */

const route = useRoute()

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

/* Deleting a session removes its strips and their photos from the phone, so it
   asks first, and says how many strips that is. Fixtures (`#/?history`) are
   not stored and cannot be deleted. */
async function remove(s) {
  const go = await confirm({
    title: t('welcome.deleteTitle', { day: s.day }),
    body: t('welcome.deleteBody', { n: s.counts.length }),
    stay: t('welcome.deleteStay'),
    go: t('welcome.deleteGo'),
  })
  if (go) await session.deleteSession(s.id)
}

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

      <!-- The doors under the picture, on every width: one column to read down,
           so opening the demo never sends the eye to the other side. -->
      <WelcomeDoors />
    </section>

    <section v-if="sessions.length" class="history">

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
            <button
              class="delete t-label"
              type="button"
              :aria-label="t('welcome.deleteTitle', { day: s.day })"
              @click="remove(s)"
            >
              {{ t('welcome.delete') }}
            </button>
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
.delete {
  flex: none;
  min-height: var(--hit-min);
  padding: 0 var(--sp-10);
  border: var(--bd-inner) solid var(--ink);
  color: var(--ink);
  background: var(--paper);
}

.badges {
  flex: none;
  display: flex;
  align-items: center;
  gap: 4px;
}

/* Laptop: the same single column, centred and wider, so it reads top to
   bottom as it does on a phone (Oct 2026 — two columns sent the eye across
   the screen as soon as the demo was opened). */
.wide .welcome {
  align-items: center;
}
.wide .doors,
.wide .history {
  width: 100%;
  max-width: 800px;
}
.wide .doors {
  padding: 40px var(--sp-16) var(--sp-22);
  gap: var(--sp-22);
}
/* Wide enough that the intro sets in four lines and the picture under it
   leaves the demo button on the first screen of a 900px-tall laptop. */
.wide .picture {
  width: 100%;
  max-width: 480px;
  align-self: center;
}
.wide .history {
  padding-bottom: 48px;
}
</style>
