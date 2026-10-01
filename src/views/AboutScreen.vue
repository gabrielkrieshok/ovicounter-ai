<script setup>
import { useRouter } from 'vue-router'

import AppButton from '@/components/AppButton.vue'
import AppWordmark from '@/components/AppWordmark.vue'
import { t } from '@/i18n'
import { version } from '../../package.json'

/* About — from the menu (Oct 2026). A proof of concept, said plainly: the
 * problem, what the app does, where the AI is today and where it fits next,
 * why the person stays in charge, what is not known yet, what is kept, and
 * where it comes from. Every sentence is DRAFT (docs/copy-to-ratify.md). It is
 * the one screen that talks about trained detectors, because it explains the
 * roadmap — and it says plainly that nothing learns on the phone. */
const router = useRouter()

const SECTIONS = [
  'poc',
  'problem',
  'what',
  'why',
  'aiNow',
  'authority',
  'aiNext',
  'unknowns',
  'record',
  'phone',
  'origin',
  'openSource',
]

/* A section's text is one or more paragraphs, split on blank lines. */
const paragraphs = (key) => t(`about.${key}`).split(/\n\s*\n/)

function done() {
  if (window.history.state?.back) router.back()
  else router.push({ name: 'welcome' })
}
</script>

<template>
  <div class="about">
    <header class="head">
      <AppWordmark :size="40" />
      <p class="version t-label">{{ t('about.version', { version }) }}</p>
      <p class="lede t-title">{{ t('about.lede') }}</p>
    </header>

    <section v-for="key in SECTIONS" :key="key" class="section">
      <h2 class="name t-title">{{ t(`about.${key}Title`) }}</h2>
      <p v-for="(text, i) in paragraphs(key)" :key="i" class="text t-body">{{ text }}</p>
    </section>

    <div class="links">
      <AppButton variant="quiet" @click="router.push({ name: 'guide' })">{{ t('guide.open') }}</AppButton>
    </div>

    <div class="footer">
      <AppButton variant="primary" bar @click="done">{{ t('guide.done') }}</AppButton>
    </div>
  </div>
</template>

<style scoped>
.about {
  height: 100%;
  overflow-y: auto;
  background: var(--paper);
  display: flex;
  flex-direction: column;
}

.head {
  padding: var(--sp-22) var(--sp-16) var(--sp-16);
  border-bottom: var(--bd) solid var(--ink);
}
.version {
  margin: var(--sp-8) 0 0;
  color: var(--muted);
}

.section {
  padding: var(--sp-16);
}
.section + .section {
  border-top: var(--bd-inner) solid var(--ink);
}
.name {
  margin: 0 0 var(--sp-8);
}
.text {
  margin: 0;
}
.text + .text {
  margin-top: var(--sp-12);
}
.lede {
  margin: var(--sp-16) 0 0;
}

.links {
  padding: 0 var(--sp-16) var(--sp-16);
}

.footer {
  flex: none;
  position: sticky;
  bottom: 0;
  margin-top: auto;
}

.wide .about {
  width: 100%;
  max-width: 720px;
  margin: 0 auto;
  border-left: var(--bd) solid var(--ink);
  border-right: var(--bd) solid var(--ink);
}
</style>
