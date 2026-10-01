<script setup>
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'

import AppButton from '@/components/AppButton.vue'
import { DEMO_PHOTO } from '@/lib/samples'
import { t } from '@/i18n'
import { useSessionStore } from '@/stores/session'
import { useStripStore } from '@/stores/strip'

/* Refusal — the highest-stakes surface in the flow.
 *
 * The tool has declined to count a photograph the operator just took. Four
 * rules govern it, and they are the reason this is a screen rather than a
 * toast:
 *
 *   It blames the PHOTO, never the person. "Too far away to count", not "you
 *   were too far away".
 *
 *   Exactly ONE instruction. The gate knows several things are wrong sometimes;
 *   it reports the first one in dependency order and says only that, because an
 *   operator given three fixes does none of them.
 *
 *   EVIDENCE the operator can check. Their photograph beside a countable one,
 *   at the same size, so the difference is visible rather than asserted.
 *
 *   ONE way forward, and it goes back to the camera. No dismiss, no "continue
 *   anyway", no dead end.
 *
 * Nothing here lands in the record: the strip counter does not advance, and the
 * refusal is counted only so the session summary can report it.
 */

const router = useRouter()
const session = useSessionStore()
const strip = useStripStore()

const reason = computed(() => strip.gate?.reason ?? 'tooFar')

const copy = computed(() => ({
  title: t(`refusal.${reason.value}Title`),
  body: t(`refusal.${reason.value}Body`),
}))

onMounted(() => {
  if (!strip.sourceUrl) router.replace({ name: 'capture' })
})

function takeAgain() {
  /* The refused frame is finished with. Object URLs are not garbage collected
     on their own, and a session is many photographs. */
  if (strip.sourceUrl?.startsWith('blob:')) URL.revokeObjectURL(strip.sourceUrl)
  strip.$reset()
  /* Back to the same way in: the camera if that is what took it, the photo
     choice if a photo was chosen (Capture opens on the choice then). */
  router.replace(session.source === 'camera' ? { name: 'capture', query: { camera: '1' } } : { name: 'capture' })
}
</script>

<template>
  <div class="refusal" :style="{ backgroundImage: `url(${strip.sourceUrl})` }">
    <div class="scrim">
      <div class="card">
        <h1 class="title t-display">{{ copy.title }}</h1>
        <p class="body t-body">{{ copy.body }}</p>

        <div class="evidence">
          <div class="side">
            <div class="shot" :style="{ backgroundImage: `url(${strip.sourceUrl})` }" />
            <div class="caption t-label">{{ t('refusal.yourPhoto') }}</div>
          </div>
          <div class="side">
            <!-- A strip the tool would accept, at the same size. The comparison
                 is the argument; without it the refusal is just an assertion. -->
            <div class="shot reference" :style="{ backgroundImage: `url(${DEMO_PHOTO})` }" />
            <div class="caption t-label">{{ t('refusal.closeEnough') }}</div>
          </div>
        </div>

        <AppButton class="again" variant="primary" bar @click="takeAgain">
          {{ t('refusal.takeAgain') }}
        </AppButton>
      </div>
    </div>
  </div>
</template>

<style scoped>
.refusal {
  container-type: inline-size;
  height: 100%;
  background-size: cover;
  background-position: center;
  background-color: var(--stage-bg);
}
.scrim {
  height: 100%;
  background: var(--scrim);
  display: flex;
  align-items: center;
  padding: var(--sp-16) 0;
}

/* Square, 3px, one instruction and one way forward (Field Manual brief §4). It
   blames the photograph, never the person. */
.card {
  width: 100%;
  max-width: 560px;
  margin: 0 auto;
  background: var(--paper);
  border: var(--bd) solid var(--ink);
  border-width: var(--bd) 0;
  border-radius: var(--r-primary);
  padding: var(--sp-16) var(--sp-16) 0;
}
/* On a phone the card runs the full width. Inset by 16px a side, Spanish and
   Portuguese refusal titles ran to three lines ("Demasiado desfocada para
   contar", "No se encontraron huevos en esta foto"); full width, all twelve
   fit in two. A container query, because in the ?frame=1 phone frame the
   viewport is wide and the screen is not. */
@container (min-width: 600px) {
  .scrim {
    padding: var(--sp-16);
  }
  .card {
    border-width: var(--bd);
  }
}

.title {
  margin: 0 0 var(--sp-10);
}
.body {
  margin: 0 0 var(--sp-16);
  color: var(--ink);
}

.evidence {
  display: flex;
  gap: var(--sp-10);
  margin-bottom: 20px;
}
.side { flex: 1; }
.shot {
  height: 84px;
  border: var(--bd) solid var(--ink);
  border-radius: var(--r-panel);
  background-size: cover;
  background-position: center;
  background-color: var(--stage-bg);
}
/* Zoomed to the scale a countable photograph is taken at, so the two thumbnails
   differ in the way the refusal is talking about. */
.reference {
  background-size: 300%;
  background-position: 52% 35%;
}
.caption {
  margin-top: var(--sp-5);
  text-align: center;
  color: var(--muted);
}

/* Take it again runs the card's full width at its foot, as a bar. */
.again {
  margin: 0 calc(-1 * var(--sp-16));
  width: calc(100% + 2 * var(--sp-16));
}
</style>
