<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'

import AppButton from '@/components/AppButton.vue'
import { t, weekday } from '@/i18n'
import { demoPhoto } from '@/lib/samples'
import { useSessionStore } from '@/stores/session'
import { useStripStore } from '@/stores/strip'

/* Welcome's doors: an unfinished session to resume, the demo (which opens onto
 * its three photographs), Count one strip, Start a new session, and How it
 * works. One component because the laptop puts them in the right-hand column
 * and the phone under the intro — the same doors, in either place.
 *
 * "Count one strip" (Sep 2026, brief §4) is the short path: photo → crop →
 * marks → fix if wanted → number. No session, nothing saved unless asked. The
 * demo is a quick count on a bundled or drawn strip; choosing which is the
 * second of its four decisions (Oct 2026). */

const router = useRouter()
const session = useSessionStore()
const strip = useStripStore()

const demosOpen = ref(false)

/* An interrupted session — the app closed, the phone died, the technician was
   called away. The strips already in it are real work, so it is offered rather
   than quietly discarded. */
async function resume() {
  if (!(await session.resume(session.resumable.id))) return
  router.push({ name: 'capture' })
}
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

/* The demo saves nothing. It skips Capture, because there is no photograph to
   take, and lands on Crop with it in hand. */
async function startDemo(kind) {
  await session.start({ demo: true, quick: true, demoKind: kind })
  const { url, drawn } = await demoPhoto(kind)
  strip.beginFromPhoto(url, { drawn })
  router.push({ name: 'crop' })
}
</script>

<template>
  <div class="welcome-doors">
    <!-- Above the doors: an interrupted session is unfinished
         work, and starting a new one on top of it loses the thread. -->
    <button v-if="session.resumable" class="resume" type="button" @click="resume">
      <span class="t-label">{{ t('welcome.resumeNext', { n: resumeNext }) }}</span>
      <span class="t-title">{{ t('welcome.resumeDay', { day: resumeDay }) }}</span>
    </button>

    <div class="actions">
      <!-- The demo first, in yellow: for now most people opening this are
           seeing what it does, not counting a strip. It opens onto the three
           demos (Oct 2026), so choosing one is the second decision and the
           demo reaches a number in four. -->
      <div class="demo">
        <AppButton variant="primary" :aria-expanded="demosOpen" @click="demosOpen = !demosOpen">
          {{ t('welcome.tryDemo') }}
        </AppButton>
        <div v-if="demosOpen" class="choices">
          <button class="choice" type="button" @click="startDemo('clean')">
            <span class="t-title">{{ t('welcome.demoClean') }}</span>
            <span class="t-body note-line">{{ t('welcome.demoCleanNote') }}</span>
          </button>
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
  </div>
</template>

<style scoped>
.welcome-doors {
  display: flex;
  flex-direction: column;
  gap: var(--sp-16);
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
.choices {
  display: flex;
  flex-direction: column;
  border: var(--bd) solid var(--ink);
  border-top: 0;
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

.how {
  margin: calc(-1 * var(--sp-8)) 0;
}
</style>
