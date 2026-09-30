<script setup>
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import AppButton from '@/components/AppButton.vue'
import AppMenu from '@/components/AppMenu.vue'
import AppWordmark from '@/components/AppWordmark.vue'
import StatusBadge from '@/components/StatusBadge.vue'
import { t } from '@/i18n'
import { useSessionStore } from '@/stores/session'
import { useStripStore } from '@/stores/strip'

/* The app bar: a way home, and a menu.
 *
 * A deliberate departure from the handoff, which has no app bar and says so —
 * "No tab bar — the flow is linear." That reasoning was not wrong: mid-session,
 * navigation is an exit, and the loop is the product. Two things keep it from
 * being a hazard.
 *
 * It is NOT ON REFUSAL. That screen's whole discipline is one instruction and
 * one way forward; a home button and a menu would give three ways out of the
 * one place the operator most needs a single one. It IS on Welcome since the
 * Field Manual pass (Sep 30, 2026): one bar on every screen carries the name,
 * and there it also carries WORKS OFFLINE ✓.
 *
 * And LEAVING MID-STRIP ASKS FIRST. Finished strips are written to the device
 * as they are counted, so going home costs only the strip in hand, and the
 * session reappears on Welcome as resumable. The confirmation says exactly
 * that, rather than a generic warning that would be either alarming or false.
 */

const route = useRoute()
const router = useRouter()
const session = useSessionStore()
const strip = useStripStore()

/* The strip counter, in yellow beside the name: where you are in a session.
   Only while a strip is in hand or has just been counted — on a quick count
   there is no session to count through, and between strips there is no strip.
   Once the strip is recorded it is already in `session.strips`, so the number
   is the length, not the next one. There is no "of 8": nothing knows how many
   strips a sitting will be (see stores/session.js). */
const stripLabel = computed(() => {
  if (!session.isActive || session.isQuick || !strip.working) return ''
  const n = strip.recorded ? session.strips.length : session.stripNumber
  return t('capture.strip', { n })
})

const menuOpen = ref(false)
const confirming = ref(false)

/* A strip is "in hand" once it has a working image but has not been written
   into the session. Before that there is nothing to lose; after it, the record
   is already safe. */
const stripInHand = computed(() => !!strip.working && !strip.recorded)

function goHome() {
  if (stripInHand.value) confirming.value = true
  else leave()
}

function leave() {
  confirming.value = false
  strip.$reset()
  router.push({ name: 'welcome' })
}
</script>

<template>
  <header class="bar">
    <div class="left">
      <button class="home" type="button" :aria-label="t('menu.home')" @click="goHome">
        <AppWordmark :size="24" />
      </button>
      <span v-if="stripLabel" class="counter t-label">{{ stripLabel }}</span>
    </div>

    <div class="right">
      <!-- On Welcome only: the promise belongs before anything starts. -->
      <StatusBadge v-if="route.name === 'welcome'" on-dark>{{ t('app.offline') }}</StatusBadge>
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
  </header>

  <AppMenu :open="menuOpen" @close="menuOpen = false" />

  <div v-if="confirming" class="confirm" @click="confirming = false">
    <div class="confirm-sheet" @click.stop>
      <h2 class="title">{{ t('menu.leaveTitle') }}</h2>
      <p class="body">{{ t('menu.leaveBody') }}</p>
      <!-- Staying is the filled, larger, first button. The destructive path is
           available but never the one the thumb falls on. -->
      <AppButton variant="primary" @click="confirming = false">
        {{ t('menu.leaveStay') }}
      </AppButton>
      <AppButton variant="secondary" @click="leave">
        {{ t('menu.leaveGo') }}
      </AppButton>
    </div>
  </div>
</template>

<style scoped>
/* Black, so the bar reads as app chrome rather than as another screen header.
   Anything that belongs to the bar rather than the screen (Welcome's
   WORKS OFFLINE ✓) goes in the default slot, left of the menu. */
.bar {
  flex: none;
  height: var(--hit-secondary);
  background: var(--ink);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 var(--sp-12);
}

.left,
.right {
  display: flex;
  align-items: center;
  gap: var(--sp-12);
  min-width: 0;
}

.home {
  height: var(--hit-min);
  display: flex;
  align-items: center;
  padding: 0 4px;
  color: var(--paper);
}

.counter {
  color: var(--action);
  font-size: 13px;
  white-space: nowrap;
}

.burger {
  width: var(--hit-min);
  height: var(--hit-min);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
}
.burger span {
  width: 22px;
  height: 3px;
  background: var(--paper);
}

/* Not `.scrim`: AppMenu's root element carries this component's scope
   attribute too, as every child root does, so a `.scrim` rule here also styled
   the menu's backdrop — and centred the menu sheet on a laptop. */
.confirm {
  position: absolute;
  inset: 0;
  z-index: 11;
  background: var(--scrim);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: var(--sp-16);
}
/* Capped at the phone's width, for the same reason as the menu sheet. A
   percentage margin is a share of the WIDTH, so 22% — about 76px in the frame —
   became 300px on a laptop; the cap keeps the phone's drop at any width. */
.confirm-sheet {
  width: 100%;
  max-width: var(--device-w);
  margin-top: min(22%, 84px);
  background: var(--paper);
  border: var(--bd) solid var(--ink);
  border-radius: var(--r-primary);
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: var(--sp-12);
}

.title {
  margin: 0;
  font: 800 20px var(--font-sans);
  letter-spacing: -0.01em;
}
.body {
  margin: 0 0 4px;
  font: 400 15px var(--font-sans);
  color: var(--ink);
  line-height: 1.45;
}
</style>
