/* Finding a representative egg without a finger.
 *
 * Calibration needs one measured egg: its area sets the size filters and the
 * watershed spacing, its contrast seeds the cutoff (cv/params.js). The ratified
 * design got that egg from a tap on "Mark one egg". Measured on the demo strip,
 * one tap is not enough: taps a few millimetres apart produced 434 and 1,192
 * marks on the same strip where the truth is around 364, because a single blob
 * is a sample of one and a strip offers plenty of unrepresentative ones.
 *
 * So the app now measures first and asks second. This probes a grid across the
 * working image with the SAME measurement the tap makes — `measureBlobAt`
 * already refuses bare paper, stains and folds — and describes the population
 * it finds. The tap survives as the correction: reached from Refine when the
 * marks look wrong, and used automatically when the probe finds nothing.
 *
 * What "describes" means, because getting it wrong cost a round in the
 * harness: grid statistics are not how the screen is used, and the median over
 * every hit is not an egg. On the demo strip that median reported a 49px² blob
 * at contrast 41 when the eggs are 80px² and near-black — most grid points land
 * on paper, and the most COMMON dark thing on a textured strip is grain that
 * scrapes past the contrast gate. The screen asks for "one egg you can see
 * clearly", so the selection models that: keep the hits in the top quartile by
 * contrast, the ones that are unmistakably eggs, and take their medians. The
 * grid FINDS eggs; it never decides what an egg is.
 *
 * Shared by the app (stores/strip.js) and the dev harness (tools/harness.js),
 * so the number the harness reports is the number the app will produce.
 */

import { luminanceFrame, measureBlobInFrame } from '@/lib/image.js'

/* Fewer hits than this and the medians describe noise, not eggs. The probe
   returns null and the operator is asked to mark one. */
export const PROBE_MIN_HITS = 8

/* Grid pitch as a fraction of the frame. 0.02 puts ~45 probes across the long
   edge; an egg is ~12px on a 1200px frame, so this is a sample, not a census. */
const GRID_STEP = 0.02
const GRID_MARGIN = 0.06

/* The probe window. Narrower than the tap's 61px because the grid is dense and
   the window only has to contain one egg, not forgive a thumb. */
const WINDOW_PX = 41

/**
 * @param canvas  the working image (lib/image.js `renderWorkingImage`)
 * @returns the same shape `measureBlobAt` returns, plus `longEdgePx`,
 *          `samples` (grid hits) and `clear` (hits used for the medians) —
 *          or null when fewer than PROBE_MIN_HITS blobs measured as eggs.
 */
export function probeForEgg(canvas) {
  const frame = luminanceFrame(canvas)
  const found = []
  for (let gy = GRID_MARGIN; gy < 1 - GRID_MARGIN + 0.01; gy += GRID_STEP) {
    for (let gx = GRID_MARGIN; gx < 1 - GRID_MARGIN + 0.01; gx += GRID_STEP) {
      const m = measureBlobInFrame(frame, gx, gy, WINDOW_PX)
      if (m) found.push(m)
    }
  }
  if (found.length < PROBE_MIN_HITS) return null

  const clear = found
    .slice()
    .sort((a, b) => b.contrast - a.contrast)
    .slice(0, Math.max(4, Math.round(found.length * 0.25)))

  const median = (pick) => {
    const xs = clear.map(pick).sort((a, b) => a - b)
    return xs[xs.length >> 1]
  }

  return {
    areaPx: median((m) => m.areaPx),
    rPx: median((m) => m.rPx),
    contrast: median((m) => m.contrast),
    wPx: median((m) => m.wPx),
    hPx: median((m) => m.hPx),
    /* The egg's long edge. An egg is an oval roughly twice as long as it is
       wide, so the diameter of an equal-area circle badly understates it — and
       the resolution floor in docs/gate-study-RESULTS.md was measured as a
       BOUNDING BOX. Comparing the two would declare the demo strip unreadable. */
    longEdgePx: median((m) => Math.max(m.wPx, m.hPx)),
    /* The position of the clearest egg, so a screen that wants to draw "the
       egg the app measured" has somewhere to draw it. */
    x: clear[0].x,
    y: clear[0].y,
    samples: found.length,
    clear: clear.length,
  }
}

/* A tapped blob this far from the probe's median area is more likely a clump
   (or a fragment) than a representative egg. Two-fold either way: eggs on one
   strip vary by less than that, and a clump of two is already past it. */
export const TAP_MISMATCH_RATIO = 2

/**
 * Compare the operator's tapped egg with what the probe found.
 *
 * Returns 'bigger', 'smaller' or null. The screen says so before the tap is
 * accepted — a tap on a clump inflates every size-dependent parameter and the
 * scan then rejects every single egg as too small, and nothing in the pipeline
 * can see that happening because a clump is a perfectly well-formed dark blob.
 */
export function judgeTapAgainstProbe(tap, probe) {
  if (!tap || !probe || !probe.areaPx) return null
  const ratio = tap.areaPx / probe.areaPx
  if (ratio > TAP_MISMATCH_RATIO) return 'bigger'
  if (ratio < 1 / TAP_MISMATCH_RATIO) return 'smaller'
  return null
}
