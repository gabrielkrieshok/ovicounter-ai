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
 * The steps on this strip's path. The demo starts from a bundled photo, so it
 * has no Photograph step. A quick count skips Refine unless the person went
 * there ("Marks look wrong? Adjust them"), and then it is part of their path.
 */
export function stepsFor({ isDemo, isQuick, visitedRefine }) {
  return STEPS.filter((s) => {
    if (s.key === 'photo' && isDemo) return false
    if (s.key === 'refine' && isQuick && !visitedRefine) return false
    return true
  })
}

/** The step a route belongs to, or null for screens outside a strip. */
export function stepForRoute(name) {
  return STEPS.find((s) => s.route === name || s.also?.includes(name)) ?? null
}
