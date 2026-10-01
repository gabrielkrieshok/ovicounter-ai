/* The steps one strip goes through, in order — the spine of the step list on
 * the laptop and the step strip on the phone (Sep 30, 2026).
 *
 * The screens were always linear; nothing showed it. Now the person can see
 * where they are, what is done and what is next, and go back to a step they
 * finished. Going back only looks: later work stays until an earlier step is
 * actually changed, and changing one that would find the marks again asks
 * first (lib/confirm.js).
 *
 * Mark one egg is not a step of its own. It is part of measuring — the
 * correction when the measurement looked wrong — so on that screen the list
 * shows Measure as the current step. Refusal belongs to Photograph.
 */

export const STEPS = [
  { key: 'photo', route: 'capture', also: ['refusal'] },
  { key: 'crop', route: 'crop' },
  { key: 'measure', route: 'processing', also: ['calibrate'] },
  { key: 'check', route: 'fixes' },
  { key: 'count', route: 'result' },
]

/**
 * All five steps, always, numbered as the Guide numbers them — so step 3 is
 * Measure on every screen, in every path, and in the Guide. Refine was a step
 * of its own until Oct 2026; its sliders are now part of Measure, and step 4,
 * Manually refine, is the hand pass. A path that does not need a step keeps it
 * in its place, marked `skipped`: the demo starts from a photo it already has.
 */
export function stepsFor({ isDemo }) {
  return STEPS.map((s) => ({
    ...s,
    skipped: s.key === 'photo' && isDemo,
    optional: false,
  }))
}

/** A step's place among the six, for telling forward from back. */
export function stepIndex(name) {
  const step = stepForRoute(name)
  return step ? STEPS.indexOf(step) : -1
}

/** The step a route belongs to, or null for screens outside a strip. */
export function stepForRoute(name) {
  return STEPS.find((s) => s.route === name || s.also?.includes(name)) ?? null
}
