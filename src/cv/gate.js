/* The capture gate.
 *
 * At a table a retake costs ten seconds, and an uncountable photograph poisons
 * both the count and the dataset it feeds. So the gate REFUSES rather than
 * warns (design brief §3), and it does so before a session's worth of unusable
 * images has been collected.
 *
 * It answers exactly three questions, in the order that makes them answerable:
 * a photograph too dark to judge cannot be judged for blur, and one too blurry
 * to resolve an edge cannot be measured for egg size.
 *
 * ---------------------------------------------------------------------------
 * The resolution floor, measured
 *
 * V2 §9 carried this as an open question: the workable range was bracketed —
 * fails at ~3px per egg, works at ~15px — but nobody had swept the middle, and
 * a gate cannot enforce a bracket. Rendering the demo strip at descending
 * resolutions and running the real pipeline at each gives the curve:
 *
 *     egg long edge   recall vs. the same detector at full resolution
 *              14px   100%
 *              12px    97%
 *              10px    63%
 *               8px    57%
 *               7px    49%
 *               6px    20%
 *               4px     6%
 *
 * The output is stable to 12px and changes fast below it. But that is NOT the
 * refusal threshold, and reading it as one was the first mistake here:
 *
 *   - The reference is the same detector at full resolution, not hand-labelled
 *     truth, which does not exist for this strip. If the 1200px run includes
 *     false positives, "57% recall" at 8px partly measures losing those. The
 *     curve locates where the detector's answer becomes unstable; it does not
 *     say what fraction of real eggs survive.
 *
 *   - Set the gate at 12px and it refuses Portugal, whose eggs measure ~8px
 *     here and which an independent study measured at 0.97 egg recall. A gate
 *     that refuses the site the pipeline was validated on is wrong, whatever
 *     the curve says.
 *
 * So the two numbers answer different questions, and the gate uses the lower
 * one. Refusal is reserved for photographs where the shape information is
 * genuinely absent — El Salvador's 1–3px specks, where the original study found
 * no method recovers shape. Everything above that is the operator's to judge,
 * with the sliders and their own eyes.
 *
 * The asymmetry is deliberate. A false refusal blocks the operator completely
 * and abandonment is the failure signal this product is designed against (§8);
 * a photograph that is merely mediocre still produces marks the operator can
 * cull. Refuse only what cannot be counted at all.
 */

import { measureBlobAt } from '@/lib/image'

/**
 * Egg long edge, in working pixels, below which the shape is simply not there.
 * Refusal threshold — deliberately well under the 12px stability knee. See the
 * note above for why those are different numbers.
 */
export const RESOLUTION_FLOOR_PX = 6

/** Where the detector's answer stops being stable. Not a refusal threshold. */
export const QUALITY_KNEE_PX = 12

/* Set from the bundled photographs — `node tools/run-harness.mjs --gate=1`
   prints these metrics for every one of them. */
export const THRESHOLDS = {
  /* Mean luminance. Below this, eggs and shadow are the same colour. The
     darkest bundled photograph reads 80, so this leaves real headroom. */
  minBrightness: 55,

  /* Variance of the Laplacian: the classic focus measure — a sharp edge has a
     large second derivative and a soft one does not.
     UNCALIBRATED, and honestly so: not one bundled photograph is out of focus,
     so there is nothing here to set this against. The corpus spans 37 (Jamaica,
     sparse eggs on pale paper) to 701 (the demo strip), and the measure is
     strongly content-dependent — a sparse strip scores low in perfect focus.
     So it sits below everything real, where it can only catch severe blur, and
     it needs a genuinely blurred field photograph before it means anything. */
  minSharpness: 20,

  /* Fewer measurable eggs than this and there is nothing to calibrate from —
     an empty strip, or a photograph of something else entirely. */
  minEggs: 4,
}

/**
 * Measure a frame. Returns the metrics as well as the verdict, so the screen
 * can show what was checked rather than only whether it passed.
 *
 * `reason` is the FIRST failure in dependency order, because that is the one
 * instruction the operator should be given. Refusals carry exactly one.
 */
export function assessFrame(cv, imageData, options = {}) {
  const floorPx = options.floorPx ?? RESOLUTION_FLOOR_PX
  const scale = options.scale ?? 1

  const src = cv.matFromImageData(imageData)
  const gray = new cv.Mat()
  const lap = new cv.Mat()
  const mean = new cv.Mat()
  const stddev = new cv.Mat()

  try {
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY)

    const brightness = cv.mean(gray)[0]

    cv.Laplacian(gray, lap, cv.CV_64F)
    cv.meanStdDev(lap, mean, stddev)
    const sharpness = stddev.data64F[0] ** 2

    /* Egg size uses the same measurement the calibration screen makes, so the
       gate and the operator's tap agree about what an egg is. */
    const probe = probeEggs(imageData)

    /* Sizes are reported at the frame's own scale; the gate cares about how
       many pixels an egg will have in the WORKING image, which is what the
       pipeline sees. */
    const eggPx = probe.longEdgePx / scale

    const tooDark = brightness < THRESHOLDS.minBrightness
    const tooBlurry = sharpness < THRESHOLDS.minSharpness
    const noEggs = probe.count < THRESHOLDS.minEggs
    const tooFar = !noEggs && eggPx < floorPx

    let reason = null
    if (tooDark) reason = 'tooDark'
    else if (tooBlurry) reason = 'tooBlurry'
    else if (tooFar) reason = 'tooFar'
    else if (noEggs) reason = 'noEggs'

    return {
      pass: reason === null,
      reason,
      metrics: {
        brightness: Math.round(brightness),
        sharpness: Math.round(sharpness),
        eggPx: Math.round(eggPx * 10) / 10,
        eggs: probe.count,
      },
      /* What the three chips on Capture show. `eggsVisible` deliberately does
         not fail on `tooFar` — the eggs ARE visible, they are just too small,
         and conflating the two would give the operator the wrong instruction. */
      checks: {
        sharp: !tooBlurry && !tooDark,
        close: !tooFar && !noEggs,
        eggsVisible: !noEggs,
      },
    }
  } finally {
    for (const mat of [src, gray, lap, mean, stddev]) {
      try {
        mat.delete()
      } catch {
        /* already deleted */
      }
    }
  }
}

/**
 * Find eggs by probing a grid with the calibration measurement, and describe
 * the clearest of them.
 *
 * The top quartile by contrast, not the median of everything: most grid points
 * land on paper, and the most common dark thing on a textured strip is grain
 * that scrapes past the contrast gate rather than an egg. Taking the median of
 * all hits reports the grain. This is the same correction the dev harness
 * needed for the same reason.
 */
function probeEggs(imageData) {
  const canvas = new OffscreenCanvas(imageData.width, imageData.height)
  canvas.getContext('2d', { willReadFrequently: true }).putImageData(imageData, 0, 0)

  const hits = []
  for (let gy = 0.1; gy < 0.92; gy += 0.06) {
    for (let gx = 0.1; gx < 0.92; gx += 0.06) {
      const m = measureBlobAt(canvas, gx, gy, 41)
      if (m) hits.push(m)
    }
  }
  if (!hits.length) return { count: 0, longEdgePx: 0 }

  const clear = hits
    .sort((a, b) => b.contrast - a.contrast)
    .slice(0, Math.max(3, Math.round(hits.length * 0.25)))
  const edges = clear.map((m) => Math.max(m.wPx, m.hPx)).sort((a, b) => a - b)

  return { count: hits.length, longEdgePx: edges[edges.length >> 1] }
}
