import { reactive } from 'vue'
import en from './en.js'
import es from './es.js'

const bundles = { en, es }

/* Follows the device. There is no language switcher because there is no
   settings screen — §9 puts those out of scope — and a technician whose phone
   is in Spanish should not have to find one. Any unset or unknown language
   falls through to English, and so does any single missing string. */
function preferredLocale() {
  const tags = globalThis.navigator?.languages ?? [globalThis.navigator?.language]
  for (const tag of tags) {
    const base = String(tag ?? '').toLowerCase().split('-')[0]
    if (base && Object.prototype.hasOwnProperty.call(bundles, base)) return base
  }
  return 'en'
}

export const i18n = reactive({ locale: preferredLocale() })

export const availableLocales = Object.keys(bundles)

function lookup(bundle, key) {
  return key.split('.').reduce((o, k) => (o == null ? undefined : o[k]), bundle)
}

/**
 * Translate `key`, interpolating `{name}` placeholders from `vars`.
 *
 * Falls back to English when the active bundle has no string, and to the key
 * itself when neither does — a missing translation degrades to English, never
 * to a blank or a raw key on screen.
 */
export function t(key, vars) {
  const s = lookup(bundles[i18n.locale], key) ?? lookup(bundles.en, key) ?? key
  if (typeof s !== 'string') return key
  if (!vars) return s
  return s.replace(/\{(\w+)\}/g, (whole, name) =>
    vars[name] === undefined ? whole : String(vars[name]),
  )
}

/* A character that cannot occur in copy, used to find one placeholder again
   after the rest of the sentence has been filled in. */
const SLOT = '\u0000'

/**
 * Translate, but split the result around one placeholder so the caller can
 * style what goes into it — a mono tabular count inside a sans sentence, or a
 * bold band name.
 *
 * The alternative is three separate strings, which asks a translator to
 * reassemble a sentence in an order the fragments do not permit. This keeps the
 * sentence whole in `en.js` and lets the placeholder land wherever the grammar
 * of the language puts it.
 */
export function tParts(key, slot, vars = {}) {
  const [before, after = ''] = t(key, { ...vars, [slot]: SLOT }).split(SLOT)
  return { before, after }
}

export function setLocale(locale) {
  if (bundles[locale]) i18n.locale = locale
}

export default {
  install(app) {
    app.config.globalProperties.$t = t
  },
}
