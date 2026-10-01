<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'

import AppButton from '@/components/AppButton.vue'
import { availableLocales, i18n, setLocale, t } from '@/i18n'
import { readSettings, saveJson, settingsFile, stamp } from '@/lib/export'
import { useSessionStore } from '@/stores/session'
import { useStripStore } from '@/stores/strip'

/* The hamburger's contents.
 *
 * Kept short: every item added here is one more thing between a technician
 * and the strip in front of them. Settings arrived in Oct 2026 (Gabriel) as
 * files, not a settings screen: the measured egg, the slider values and the
 * band scale, saved from a count and opened on another phone or another day
 * (lib/export.js).
 *
 * The language switch lives here because it had nowhere else to go: the app
 * follows the device language, which is right by default and wrong for a shared
 * phone or a mis-set one, and there is no settings screen to put it on.
 */

const props = defineProps({ open: { type: Boolean, default: false } })
const emit = defineEmits(['close'])

const router = useRouter()
const session = useSessionStore()

const localeNames = { en: 'English', es: 'Español', pt: 'Português' }

function openGuide() {
  emit('close')
  router.push({ name: 'guide' })
}

function openAbout() {
  emit('close')
  router.push({ name: 'about' })
}

/* SETTINGS. What a file would carry now: this session's measured egg and the
   sliders of the strip on screen, or else the settings already opened. */
const strip = useStripStore()
const settingsNote = ref('')
const fileInput = ref(null)
const current = computed(() => {
  const calibration = session.calibration ?? session.settings?.calibration ?? null
  const params = strip.marks.length ? { ...strip.params } : (session.settings?.params ?? null)
  return calibration || params ? { calibration: calibration ? { ...calibration } : null, params } : null
})

function exportSettings() {
  if (!current.value) return
  saveJson(settingsFile({ ...current.value, bands: session.bands }), `ovicounterai-settings-${stamp()}.json`)
  settingsNote.value = t('menu.settingsSaved')
}

async function importSettings(event) {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (!file) return
  const { settings, error } = readSettings(await file.text())
  if (error) {
    settingsNote.value = t(error === 'version' ? 'menu.settingsNewer' : 'menu.settingsBad')
    return
  }
  session.useSettings({ ...settings, name: file.name })
  settingsNote.value = t('menu.settingsOpened')
}

function stopSettings() {
  session.useSettings(null)
  settingsNote.value = ''
}

function endSession() {
  emit('close')
  router.push({ name: 'summary' })
}
</script>

<template>
  <!-- v-if, not v-show: a merely hidden menu still answers a query for its
       buttons, and "End this session" would then shadow the identically named
       action on Strip result — for the walker, and for a screen reader. -->
  <div v-if="props.open" class="scrim" @click="emit('close')">
    <div class="sheet" @click.stop>
      <div class="group">
        <div class="group-label t-label">{{ t('menu.language') }}</div>
        <div class="locales">
          <button
            v-for="locale in availableLocales"
            :key="locale"
            class="locale t-title"
            :class="{ active: i18n.locale === locale }"
            type="button"
            @click="setLocale(locale)"
          >
            {{ localeNames[locale] ?? locale }}
          </button>
        </div>
      </div>

      <!-- Not for a quick count: there is no session to end and no summary to
           show. Home ends it. -->
      <AppButton v-if="session.isActive && !session.isQuick" variant="secondary" @click="endSession">
        {{ t('menu.endSession') }}
      </AppButton>

      <!-- Settings as files: save what this count used, or open a file to
           start every new count from it. -->
      <div class="group">
        <div class="group-label t-label">{{ t('menu.settings') }}</div>
        <p v-if="session.settings" class="settings-in-use t-body">
          {{ t('menu.settingsInUse', { name: session.settings.name ?? '' }) }}
        </p>
        <div class="settings-row">
          <AppButton variant="secondary" :disabled="!current" @click="exportSettings">{{ t('menu.exportSettings') }}</AppButton>
          <AppButton variant="secondary" @click="fileInput.click()">{{ t('menu.importSettings') }}</AppButton>
        </div>
        <input ref="fileInput" class="file" type="file" accept=".json,application/json" @change="importSettings" />
        <AppButton v-if="session.settings" variant="quiet" @click="stopSettings">{{ t('menu.clearSettings') }}</AppButton>
        <p v-if="settingsNote" class="settings-note t-body" role="status">{{ settingsNote }}</p>
        <p v-else-if="!current" class="settings-note t-body">{{ t('menu.settingsNone') }}</p>
      </div>

      <AppButton variant="secondary" @click="openGuide">{{ t('guide.open') }}</AppButton>
      <AppButton variant="secondary" @click="openAbout">{{ t('about.link') }}</AppButton>

      <p class="about t-body">{{ t('menu.about') }}</p>

      <AppButton variant="secondary" @click="emit('close')">
        {{ t('menu.close') }}
      </AppButton>
    </div>
  </div>
</template>

<style scoped>
.scrim {
  position: absolute;
  inset: 0;
  z-index: 10;
  background: var(--scrim);
  display: flex;
  align-items: flex-start;
  justify-content: flex-end;
  padding: var(--sp-16);
}
/* Never wider than the phone it was designed on. On a laptop the scrim is the
   whole viewport, and a sheet at 100% of it put two language buttons 900px
   apart; capped, it hangs under the burger that opened it. */
.sheet {
  width: 100%;
  max-width: var(--device-w);
  max-height: 100%;
  overflow-y: auto;
  background: var(--paper);
  border: var(--bd) solid var(--ink);
  border-radius: var(--r-primary);
  padding: var(--sp-16);
  display: flex;
  flex-direction: column;
  gap: var(--sp-12);
}

.group-label {
  color: var(--ink);
  margin-bottom: var(--sp-8);
}
.locales {
  display: flex;
  gap: var(--sp-8);
}
/* The active language is filled, so the state is not colour alone. */
.locale {
  flex: 1;
  min-height: var(--hit-min);
  padding: 0 var(--sp-5);
  border: var(--bd) solid var(--ink);
  border-radius: var(--r-panel);
  background: var(--paper);
  color: var(--ink);
}
.locale.active {
  border-color: var(--ink);
  background: var(--ink);
  color: var(--paper);
}

.about {
  margin: 0;
  color: var(--muted);
}
.settings-row {
  display: flex;
  gap: var(--sp-8);
}
.settings-row > * {
  flex: 1;
}
.settings-in-use {
  margin: 0 0 var(--sp-8);
}
.settings-note {
  margin: var(--sp-8) 0 0;
  color: var(--muted);
}
.file {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
  pointer-events: none;
}
</style>
