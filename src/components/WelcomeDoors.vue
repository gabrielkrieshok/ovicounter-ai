<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'

import AppButton from '@/components/AppButton.vue'
import { t, weekday } from '@/i18n'
import cleanThumb from '@/assets/demo-thumbs/clean.jpg'
import fieldThumb from '@/assets/demo-thumbs/field.jpg'
import patternThumb from '@/assets/demo-thumbs/pattern.jpg'
import { demoPhoto } from '@/lib/samples'
import { useSessionStore } from '@/stores/session'
import { takeIn } from '@/lib/intake'
import { useStripStore } from '@/stores/strip'

/* Welcome's doors (Oct 2026): one way in — "Count a single paper strip" —
 * which opens onto where the photograph comes from: the camera, a photo
 * already on the phone, or one of the three demos. The camera is asked for
 * only once someone presses Use the camera; Choose a photo opens the phone's
 * own picker from here and never touches the camera at all.
 *
 * A count of one strip is the short path: photo → crop → marks → fix if
 * wanted → number. No session, nothing saved unless asked. Several strips in a
 * row — a session, each strip saved — is the quiet link under it; an
 * interrupted one waits above as a resume card. */

const router = useRouter()
const session = useSessionStore()
const strip = useStripStore()

const open = ref(false)
const fileInput = ref(null)

/* A small picture of each demo strip, so the choice is between strips and not
   between descriptions. Bundled with the app (and so precached) rather than
   cut from the full photographs, which are megabytes and fetched on demand. */
const DEMO_CHOICES = [
  { kind: 'clean', thumb: cleanThumb },
  { kind: 'field', thumb: fieldThumb },
  { kind: 'pattern', thumb: patternThumb },
]
const cap = (k) => k.charAt(0).toUpperCase() + k.slice(1)

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
  strip.$reset()
  await session.start()
  router.push({ name: 'capture' })
}

async function useCamera() {
  strip.$reset()
  await session.start({ quick: true })
  router.push({ name: 'capture', query: { camera: '1' } })
}

/* The picker opens straight from the button press (a browser will only open it
   from one); the photo then goes through the same gate as a camera frame. */
async function photoChosen(event) {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (!file) return
  await session.start({ quick: true })
  router.push({ name: await takeIn(URL.createObjectURL(file), 'photo') })
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
    <!-- Above the doors: an interrupted session is unfinished work, and
         starting a new one on top of it loses the thread. -->
    <button v-if="session.resumable" class="resume" type="button" @click="resume">
      <span class="t-label">{{ t('welcome.resumeNext', { n: resumeNext }) }}</span>
      <span class="t-title">{{ t('welcome.resumeDay', { day: resumeDay }) }}</span>
    </button>

    <div class="count">
      <AppButton variant="primary" :aria-expanded="open" @click="open = !open">
        {{ t('welcome.countSingle') }}
      </AppButton>

      <div v-if="open" class="sources">
        <button class="choice" type="button" @click="useCamera">
          <span class="words">
            <span class="t-title">{{ t('welcome.useCamera') }}</span>
            <span class="t-body note-line">{{ t('welcome.useCameraNote') }}</span>
          </span>
        </button>
        <button class="choice" type="button" @click="fileInput.click()">
          <span class="words">
            <span class="t-title">{{ t('welcome.choosePhoto') }}</span>
            <span class="t-body note-line">{{ t('welcome.choosePhotoNote') }}</span>
          </span>
        </button>
        <input ref="fileInput" class="file" type="file" accept="image/*" @change="photoChosen" />

        <div class="or t-label">{{ t('welcome.orDemo') }}</div>
        <button
          v-for="c in DEMO_CHOICES"
          :key="c.kind"
          class="choice"
          type="button"
          @click="startDemo(c.kind)"
        >
          <img class="thumb" :src="c.thumb" alt="" />
          <span class="words">
            <span class="t-title">{{ t(`welcome.demo${cap(c.kind)}`) }}</span>
            <span class="t-body note-line">{{ t(`welcome.demo${cap(c.kind)}Note`) }}</span>
          </span>
        </button>
      </div>
      <p class="note t-body">{{ t('welcome.countSingleNote') }}</p>
    </div>

    <!-- How it works is a door of its own (Oct 2026), not a link: for anyone
         new, it is the other place to start. -->
    <div class="count">
      <AppButton variant="secondary" @click="router.push({ name: 'guide' })">
        {{ t('guide.open') }}
      </AppButton>
      <p class="note t-body">{{ t('welcome.guideNote') }}</p>
    </div>

    <AppButton variant="quiet" class="link" @click="startSession">{{ t('welcome.sessionLink') }}</AppButton>
  </div>
</template>

<style scoped>
.welcome-doors {
  display: flex;
  flex-direction: column;
  gap: var(--sp-16);
}

.count {
  display: flex;
  flex-direction: column;
}
.sources {
  display: flex;
  flex-direction: column;
  border: var(--bd) solid var(--ink);
  border-top: 0;
}
.or {
  padding: var(--sp-10) var(--sp-14) var(--sp-5);
  border-top: var(--bd) solid var(--ink);
  background: var(--panel);
  color: var(--ink);
}
.file {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
  pointer-events: none;
}
.link {
  margin: calc(-1 * var(--sp-8)) 0;
}

.choice {
  min-height: var(--hit-secondary);
  padding: var(--sp-10) var(--sp-14) var(--sp-10) var(--sp-10);
  display: flex;
  align-items: center;
  gap: var(--sp-12);
  text-align: left;
  background: var(--paper);
  color: var(--ink);
}
.thumb {
  flex: none;
  width: 96px;
  height: 54px;
  object-fit: cover;
  border: var(--bd-inner) solid var(--ink);
}
.words {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}
.choice + .choice {
  border-top: var(--bd-inner) solid var(--ink);
}
.choice:active {
  background: var(--panel);
}

.note {
  margin: var(--sp-8) 0 0;
  color: var(--muted);
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

</style>
