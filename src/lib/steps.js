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
  { key: 'refine', route: 'refine' },
  { key: 'check', route: 'fixes' },
  { key: 'count', route: 'result' },
]

/**
 * All six steps, always, numbered as the Guide numbers them (Oct 2026) — so
 * step 3 is Measure on every screen, in every path, and in the Guide. A path
 * that does not need a step keeps it in its place, marked:
 *
 *   skipped   the demo starts from a photo it already has — no Photograph;
 *   optional  a quick count goes from Measure to Check the marks, and Refine
 *             is there to open ("Marks look wrong? Adjust them") — once it has
 *             been opened, it is an ordinary step on this strip.
 */
export function stepsFor({ isDemo, isQuick, visitedRefine }) {
  return STEPS.map((s) => ({
    ...s,
    skipped: s.key === 'photo' && isDemo,
    optional: s.key === 'refine' && isQuick && !visitedRefine,
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
