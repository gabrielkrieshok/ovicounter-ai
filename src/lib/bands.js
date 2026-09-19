/* The band scale.
 *
 * Settled decision §5.6: the band is the primary per-strip result, and its
 * names and edges are PLACEHOLDERS to be set per program from an explicit
 * answer to "what count would change what you do?". Nothing here is a claim
 * about entomology — it is a shape the program fills in.
 *
 * So: no band name or edge is hard-coded into a screen. Screens read this
 * module, and a program that wants five bands, or Portuguese names, or edges
 * at 10/50/200, changes only this file (later: a settings record).
 *
 * `weight` is the band's share of the width of the drawn scale. It is a visual
 * decision, not a numeric one — "many" is drawn widest because it is the band
 * a technician most often lands in, and the hi-fi ratified .6 / 1 / 1.4 / 1.
 *
 * `softMax` exists only to place the pointer inside the open-ended top band.
 * A count above it pins to the right-hand edge rather than running off it.
 *
 * `heavyweight` drives the band letter badges on Welcome, where the handoff
 * fills the ink for many/heavy and outlines none/few. It is an explicit field
 * rather than "the top half of the list" so a program that defines five bands,
 * or renames them, still decides for itself which ones read as loud.
 */

export const DEFAULT_BANDS = [
  { key: 'none', letter: 'N', min: 0, max: 0, weight: 0.6, heavyweight: false },
  { key: 'few', letter: 'F', min: 1, max: 24, weight: 1, heavyweight: false },
  { key: 'many', letter: 'M', min: 25, max: 99, weight: 1.4, heavyweight: true },
  { key: 'heavy', letter: 'H', min: 100, max: Infinity, softMax: 400, weight: 1, heavyweight: true },
]

/** The band a count falls in. Never returns undefined — the last band is open-ended. */
export function bandFor(count, bands = DEFAULT_BANDS) {
  return bands.find((b) => count >= b.min && count <= b.max) ?? bands[bands.length - 1]
}

/**
 * Where the count's pointer sits, as a 0–1 fraction of the whole scale's width.
 *
 * The pointer is positioned proportionally *within its own band*, so the number
 * stands over the part of the bar that represents it. Bands are drawn at their
 * `weight`, which has nothing to do with how many counts they span, so this
 * cannot be a single linear mapping across the scale.
 */
export function pointerFraction(count, bands = DEFAULT_BANDS) {
  const total = bands.reduce((sum, b) => sum + b.weight, 0)
  const band = bandFor(count, bands)

  let before = 0
  for (const b of bands) {
    if (b === band) break
    before += b.weight
  }

  const top = Number.isFinite(band.max) ? band.max : (band.softMax ?? band.min * 4)
  const span = Math.max(1, top - band.min)
  const within = Math.min(1, Math.max(0, (count - band.min) / span))

  return (before + within * band.weight) / total
}

/** Band letters for a session's strips, for the history cards on Welcome. */
export function bandLetters(counts, bands = DEFAULT_BANDS) {
  return counts.map((c) => bandFor(c, bands).letter)
}

/**
 * How a session's strips fell across the bands.
 *
 * Every band is returned, including the empty ones — "none 0" is a finding
 * about the route, and a histogram that silently drops its zeroes reads as if
 * those bands were never possible.
 */
export function bandHistogram(counts, bands = DEFAULT_BANDS) {
  const tally = new Map(bands.map((b) => [b.key, 0]))
  for (const count of counts) {
    const band = bandFor(count, bands)
    tally.set(band.key, tally.get(band.key) + 1)
  }
  return bands.map((band) => ({ band, count: tally.get(band.key) }))
}
