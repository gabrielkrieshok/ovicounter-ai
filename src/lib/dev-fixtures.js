/* Dev-only fixtures for checking a populated screen against the handoff.
 *
 * Persistence does not exist yet, so a real device has no session history and
 * Welcome renders its empty state. That is correct behaviour and the wrong
 * thing to compare against the hi-fi, which draws two history cards.
 *
 * Reachable only at `#/?history` in a dev build. `import.meta.env.DEV` is a
 * compile-time constant, so the call site folds away and this module is not
 * reachable from a production bundle.
 *
 * Counts below are chosen to reproduce the handoff's band letters under the
 * default band edges — they are a picture of a screen, not data about eggs.
 */

export const SESSION_HISTORY = [
  {
    id: 'fixture-tue',
    day: 'Tuesday',
    counts: [0, 12, 8, 41, 63, 180, 34, 2, 57, 91, 6, 120],
  },
  {
    id: 'fixture-mon',
    day: 'Monday',
    counts: [0, 4, 19, 30, 44, 88, 150, 210, 11, 26, 73, 99, 140, 3, 62, 38, 105, 17],
  },
]
