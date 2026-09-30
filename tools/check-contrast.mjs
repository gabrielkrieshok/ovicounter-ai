/* Check every text/background pair the design uses against WCAG 4.5:1.
 *
 *   node tools/check-contrast.mjs
 *
 * Reads the colours from src/styles/tokens.css, so a token changed there is
 * re-checked here without editing this file. The pairs are listed by hand,
 * because which colour sits on which is a design decision the CSS cannot
 * report — add a pair here when a screen puts text on a new surface.
 *
 * Sunlight is the reason this exists. The Field Manual look is black on white
 * for a phone read outdoors; a grey that passes on a monitor indoors is the
 * first thing to vanish on a field in Guatemala at noon.
 */

import { readFileSync } from 'node:fs'

const css = readFileSync(new URL('../src/styles/tokens.css', import.meta.url), 'utf8')

const tokens = {}
for (const [, name, value] of css.matchAll(/--([\w-]+):\s*([^;]+);/g)) tokens[name] = value.trim()

function resolve(name, seen = new Set()) {
  const value = tokens[name]
  if (value === undefined) throw new Error(`no token --${name}`)
  const ref = value.match(/^var\(--([\w-]+)\)$/)
  if (!ref) return value
  if (seen.has(name)) throw new Error(`cycle at --${name}`)
  seen.add(name)
  return resolve(ref[1], seen)
}

function rgb(name) {
  const hex = resolve(name).match(/^#([0-9a-f]{6})$/i)
  if (!hex) throw new Error(`--${name} is not a #rrggbb colour: ${resolve(name)}`)
  const n = parseInt(hex[1], 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

const channel = (c) => {
  const s = c / 255
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
}
const luminance = ([r, g, b]) => 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
const ratio = (a, b) => {
  const [hi, lo] = [luminance(rgb(a)), luminance(rgb(b))].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

/* [text, background, where, large?]
 *
 * `large` pairs are held to 3:1, WCAG's threshold for text ≥24px, or ≥18.7px
 * bold. The mark hues cannot move (they are the mark language), and green and
 * pink sit just under 4.5:1 on white, so the rule is: A MARK HUE IS TEXT ONLY
 * AT TALLY SIZE — the `tally` and `count` roles, 28px bold and up. Every small
 * label beside a coloured glyph or number is ink. */
const PAIRS = [
  ['ink', 'paper', 'body, titles, counts'],
  ['ink', 'panel', 'sunken panels, band zones'],
  ['muted', 'paper', 'secondary text, machine count'],
  ['muted', 'panel', 'secondary text on panels'],
  ['ink', 'action', 'primary action label'],
  ['paper', 'ink', 'app bar wordmark, filled badges'],
  ['action', 'ink', 'strip counter on the app bar'],
  ['paper', 'stage-bg', 'captions over the stage'],
  ['action', 'stage-bg', 'Processing: current step'],
  ['red', 'paper', 'tally numeral: removed', true],
  ['pink', 'paper', 'tally numeral: added', true],
  ['green', 'paper', 'tally numeral: kept', true],
]

let failures = 0
for (const [fg, bg, where, large] of PAIRS) {
  const r = ratio(fg, bg)
  const need = large ? 3 : 4.5
  const ok = r >= need
  if (!ok) failures++
  const tag = large ? '  [large text only, 3:1]' : ''
  console.log(`${ok ? '✓' : '✗'} ${r.toFixed(2).padStart(5)}:1  --${fg} on --${bg}  (${where})${tag}`)
}

/* Not text, so not held to 4.5:1 — but reported, because "never for text you
   must read" is a rule someone will eventually be tempted to break. */
console.log(`\n  ${ratio('disabled', 'paper').toFixed(2)}:1  --disabled on --paper (disabled and upcoming only; never text you must read)`)

if (failures) {
  console.log(`\n${failures} pair(s) below their threshold`)
  process.exitCode = 1
} else {
  console.log('\nall pairs pass (4.5:1; 3:1 for tally-size mark hues)')
}
