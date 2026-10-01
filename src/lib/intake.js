import { useCv } from '@/cv/use-cv'
import { WORKING_LONG_EDGE, downscaledImageData } from '@/lib/image'
import { useSessionStore } from '@/stores/session'
import { useStripStore } from '@/stores/strip'

/**
 * A new photograph, from wherever it came — the camera on Capture, or a photo
 * chosen from the phone on Welcome or Capture. It is checked by the gate
 * (cv/gate.js) before anything else happens to it, and the answer is where to
 * go next: Crop if it can be counted, Refusal if it cannot.
 *
 * One function so the camera and the chosen photo are judged identically; it
 * lived inside Capture until Welcome could pick a photo too (Oct 2026).
 *
 * `source` ('camera' | 'photo') is remembered on the session so the next strip,
 * and a Refusal's "Take it again", go back to the same place.
 */
export async function takeIn(sourceUrl, source) {
  const session = useSessionStore()
  const strip = useStripStore()
  const { cv, ready } = useCv()
  await ready

  const frame = await downscaledImageData(sourceUrl, 900)
  const verdict = await cv.assess(frame, { scale: 900 / WORKING_LONG_EDGE })

  session.source = source
  strip.beginFromPhoto(sourceUrl)
  strip.gate = { pass: verdict.pass, reason: verdict.reason, metrics: verdict.metrics }

  if (verdict.pass) return 'crop'
  /* A refused photograph does not advance the strip counter and never enters
     the record. It is counted only so the session summary can report it. */
  session.recordRefusal()
  return 'refusal'
}
