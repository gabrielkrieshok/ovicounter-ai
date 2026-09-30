<script setup>
import { useRouter } from 'vue-router'

import AppButton from '@/components/AppButton.vue'
import { availableLocales, i18n, setLocale, t } from '@/i18n'
import { useSessionStore } from '@/stores/session'

/* The hamburger's contents.
 *
 * Deliberately three things, not a settings system — §9 puts those out of
 * scope, and every item added here is one more thing between a technician and
 * the strip in front of them.
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
</style>
