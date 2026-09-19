/* Check every locale against English.
 *
 *   node tools/check-i18n.mjs
 *
 * Two failures this catches that nothing else does. A missing key degrades
 * silently to English, which is correct behaviour and therefore invisible — a
 * half-translated screen looks fine to anyone reading it in English. And a
 * placeholder dropped in translation ("{n} huevos" becoming "huevos") breaks
 * interpolation without throwing: the count simply disappears from the
 * sentence, on the screen whose entire purpose is the count.
 */

import en from '../src/i18n/en.js'
import es from '../src/i18n/es.js'

const LOCALES = { es }

const flatten = (obj, prefix = '') =>
  Object.entries(obj).flatMap(([key, value]) =>
    value && typeof value === 'object'
      ? flatten(value, `${prefix}${key}.`)
      : [`${prefix}${key}`],
  )

const get = (obj, path) => path.split('.').reduce((acc, key) => acc?.[key], obj)
const placeholders = (value) =>
  (String(value).match(/\{\w+\}/g) ?? []).sort().join(',')

const englishKeys = flatten(en)
let failures = 0

for (const [name, bundle] of Object.entries(LOCALES)) {
  const keys = new Set(flatten(bundle))
  const missing = englishKeys.filter((k) => !keys.has(k))
  const extra = [...keys].filter((k) => !englishKeys.includes(k))
  const mismatched = englishKeys.filter(
    (k) => keys.has(k) && placeholders(get(en, k)) !== placeholders(get(bundle, k)),
  )

  console.log(`\n${name}: ${keys.size}/${englishKeys.length} keys`)
  for (const [label, list] of [
    ['missing', missing],
    ['not in en', extra],
    ['placeholder mismatch', mismatched],
  ]) {
    if (list.length) {
      failures += list.length
      console.log(`  ${label}: ${list.join(', ')}`)
    }
  }
  if (!missing.length && !extra.length && !mismatched.length) console.log('  complete')
}

if (failures) process.exitCode = 1
