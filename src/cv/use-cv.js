import { createCvClient } from './client.js'

/* One worker for the whole app.
 *
 * A session is many strips, and the worker holds state worth keeping between
 * them: the 8.9MB OpenCV runtime, and the cached paper estimate for the strip
 * in hand. Spinning one up per screen would re-pay both.
 *
 * Module-level rather than a Pinia store because none of this is reactive —
 * nothing renders off the worker handle, screens just call it.
 */

let client = null
let ready = null

export function useCv() {
  if (!client) {
    client = createCvClient()
    ready = client.init()
  }
  return { cv: client, ready }
}

/**
 * Start loading OpenCV without waiting for it.
 *
 * Called from Welcome, so the runtime is warm by the time the operator has
 * framed a photograph and confirmed a crop. It costs nothing if the session
 * never gets that far, and it keeps the first scan off a cold start — the
 * design puts computation in the transitions, and a 700ms module load is not
 * something a transition can hide.
 */
export function preloadCv() {
  useCv().ready.catch(() => {
    /* Surfaced where it matters — when a screen actually awaits `ready`. */
  })
}
