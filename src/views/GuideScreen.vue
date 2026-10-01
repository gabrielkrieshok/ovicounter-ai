<script setup>
import { useRouter } from 'vue-router'

import AppButton from '@/components/AppButton.vue'
import GuideArt from '@/components/GuideArt.vue'
import MarkIntro from '@/components/MarkIntro.vue'
import StripHeader from '@/components/StripHeader.vue'
import { t } from '@/i18n'
import { STEPS } from '@/lib/steps'

/* The Guide — "How it works" — from Welcome and from the menu (Sep 30, 2026).
 *
 * One section per step, under the same names the step list uses, so what the
 * guide calls a step is what the app calls it. Each has a sentence or three
 * and a small drawing; Check the marks has Welcome's picture of the marks,
 * because that is the step the whole tool turns on.
 *
 * Reading it changes nothing and costs nothing: opened mid-strip from the
 * menu, Got it goes back to exactly where the person was. */
const router = useRouter()

function done() {
  if (window.history.state?.back) router.back()
  else router.push({ name: 'welcome' })
}
</script>

<template>
  <div class="guide">
    <StripHeader class="head" :title="t('guide.title')">
      <p class="intro t-body">{{ t('guide.intro') }}</p>
    </StripHeader>

    <ol class="sections">
      <li v-for="(step, i) in STEPS" :key="step.key" class="section">
        <div class="section-head">
          <span class="num t-title">{{ i + 1 }}</span>
          <h2 class="name t-title">{{ t(`steps.${step.key}`) }}</h2>
        </div>
        <div class="section-body">
          <MarkIntro v-if="step.key === 'check'" class="art" />
          <GuideArt v-else class="art" :kind="step.key" />
          <p class="text t-body">{{ t(`guide.${step.key}`) }}</p>
        </div>
      </li>
    </ol>

    <div class="footer">
      <AppButton variant="primary" bar @click="done">{{ t('guide.done') }}</AppButton>
    </div>
  </div>
</template>

<style scoped>
.guide {
  height: 100%;
  overflow-y: auto;
  background: var(--paper);
  display: flex;
  flex-direction: column;
}

.intro {
  margin: 0;
}

.sections {
  list-style: none;
  margin: 0;
  padding: 0;
}
.section + .section {
  border-top: var(--bd) solid var(--ink);
}
.section-head {
  display: flex;
  align-items: stretch;
  border-bottom: var(--bd-inner) solid var(--ink);
}
.num {
  flex: none;
  width: 52px;
  display: grid;
  place-items: center;
  border-right: var(--bd-inner) solid var(--ink);
}
.name {
  margin: 0;
  padding: var(--sp-10) var(--sp-16);
}
.section-body {
  padding: var(--sp-16);
  display: flex;
  flex-direction: column;
  gap: var(--sp-14);
}
.text {
  margin: 0;
}

.footer {
  flex: none;
  position: sticky;
  bottom: 0;
  margin-top: auto;
}

/* Laptop: a readable column, ruled at its sides, with each drawing beside its
   words rather than above them. */
.wide .guide {
  width: 100%;
  max-width: 880px;
  margin: 0 auto;
  border-left: var(--bd) solid var(--ink);
  border-right: var(--bd) solid var(--ink);
}
.wide .section-body {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  align-items: center;
  gap: var(--sp-22);
}
</style>
