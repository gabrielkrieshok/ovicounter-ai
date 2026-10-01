<script setup>
import { useRouter } from 'vue-router'

import AppButton from '@/components/AppButton.vue'
import AppWordmark from '@/components/AppWordmark.vue'
import { t } from '@/i18n'
import { version } from '../../package.json'

/* About — from the menu (Oct 2026). What the tool is, why it works the way it
 * does, where the record lives, and that it is open source. Every sentence is
 * DRAFT (docs/copy-to-ratify.md) and keeps to the copy rules: the app finds and
 * marks, the person checks; nothing learns; nothing leaves the phone. */
const router = useRouter()

const SECTIONS = ['what', 'why', 'record', 'phone', 'openSource']

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
    </header>

    <section v-for="key in SECTIONS" :key="key" class="section">
      <h2 class="name t-title">{{ t(`about.${key}Title`) }}</h2>
      <p class="text t-body">{{ t(`about.${key}`) }}</p>
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
