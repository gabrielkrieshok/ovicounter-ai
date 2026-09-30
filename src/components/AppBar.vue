<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'

import AppButton from '@/components/AppButton.vue'
import AppMenu from '@/components/AppMenu.vue'
import AppWordmark from '@/components/AppWordmark.vue'
import { t } from '@/i18n'
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
 * one place the operator most needs a single one. Nor on Welcome, which is
 * already home and carries the wordmark itself.
 *
 * And LEAVING MID-STRIP ASKS FIRST. Finished strips are written to the device
 * as they are counted, so going home costs only the strip in hand, and the
 * session reappears on Welcome as resumable. The confirmation says exactly
 * that, rather than a generic warning that would be either alarming or false.
 */

const router = useRouter()
const strip = useStripStore()

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
    <button class="home" type="button" :aria-label="t('menu.home')" @click="goHome">
      <AppWordmark :size="14" />
    </button>

    <button
      class="burger"
      type="button"
      :aria-label="t('menu.open')"
      :aria-expanded="menuOpen"
      @click="menuOpen = true"
    >
      <span /><span /><span />
    </button>
  </header>

  <AppMenu :open="menuOpen" @close="menuOpen = false" />

  <div v-if="confirming" class="confirm" @click="confirming = false">
    <div class="confirm-sheet" @click.stop>
      <h2 class="title">{{ t('menu.leaveTitle') }}</h2>
      <p class="body">{{ t('menu.leaveBody') }}</p>
      <!-- Staying is the filled, larger, first button. The destructive path is
           available but never the one the thumb falls on. -->
      <AppButton variant="filled" :size="62" :font="17" @click="confirming = false">
        {{ t('menu.leaveStay') }}
      </AppButton>
      <AppButton variant="outline" :size="52" :font="15" @click="leave">
        {{ t('menu.leaveGo') }}
      </AppButton>
    </div>
  </div>
</template>

<style scoped>
/* Ink, so the bar reads as app chrome rather than as another screen header.
   Several screens already open with a --panel header, and two stacked panels
   would look like one confused heading. */
.bar {
  flex: none;
  height: var(--hit-secondary);
  background: var(--ink);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 var(--sp-12);
}

.home {
  height: var(--hit-min);
  display: flex;
  align-items: center;
  padding: 0 4px;
  color: var(--paper);
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
  width: 20px;
  height: 2px;
  background: var(--paper);
  border-radius: 1px;
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
  color: var(--ink-soft);
  line-height: 1.45;
}
</style>
