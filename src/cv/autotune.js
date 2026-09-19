/* Setting the cutoff by search rather than by prediction.
 *
 * §3.1: parameter defaults can be set "by search rather than prediction" —
 * sweeping the parameter space and scoring candidate settings by stability,
 * "preferring parameter plateaus where the total count is insensitive to small
 * perturbations, on the logic (familiar from maximally stable extremal regions)
 * that wildly count-sensitive regions of parameter space are artifacts". Unlike
 * a learned parameter model this works on the first photograph from a site
 * nobody has ever visited, and it needs no training data at all.
 *
 * What the sweep actually looks like, measured on the demo strip:
 *
 *     cutoff   islands   median area
 *         20      1117            25     <- paper grain
 *         30      1715            24
 *         40      1096            21
 *         50       495            83     <- eggs
 *         60       376            80
 *         75       358            70
 *
 * Note which signal separates the two regimes. The island COUNT is not it: the
 * grain regime drifts ±15% between neighbouring cutoffs and so does the egg
 * regime, so a count-stability score alone picks the wrong plateau about as
 * often as the right one. The MEDIAN AREA is it — it steps four-fold in one
 * interval, because grain and eggs are different sizes and no cutoff makes a
 * grain the size of an egg.
 *
 * So: find the largest step in median area, and take the first cutoff above it.
 * Taking the FIRST rather than the most stable is deliberate — the pipeline is
 * tuned for recall, and the lowest cutoff that is looking at eggs proposes the
 * most of them. A false positive costs the operator one tap; a missed egg costs
 * a search of the whole strip.
 *
 * ---------------------------------------------------------------------------
 * The limit of this, measured
 *
 * That four-fold step is real on the demo strip and absent on every field
 * photograph in the bundle. Guatemala's median area declines smoothly from 28
 * to 10 across the whole sweep; Jamaica's barely moves. There is no step to
 * find because on textured paper under field light, grain and eggs overlap in
 * contrast — the separation this search looks for is not in the pixels.
 *
 * So the search reports what it found and how clean the separation was, and it
 * NEVER refuses. An earlier version treated a weak step as grounds to decline
 * the photograph, which rejected Portugal — a strip independently measured at
 * 0.97 egg recall. Declining a photograph is the capture gate's decision, made
 * on egg size in pixels against the resolution floor, and it is not this
 * function's to make.
 *
 * When the operator marks an egg, its measured contrast sets the cutoff
 * directly (seedParamsFromEgg) and this search is not consulted at all. That is
 * the path the design intends and the only one that works on a low-contrast
 * strip. This runs when nobody has tapped anything yet.
 */

import { paramsFromArea } from './params.js'

const CUTOFFS = [15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 70, 80, 95, 110, 130]

/**
 * @param run  a function taking params and returning { detections } — the
 *             pipeline's own run, so the search measures the real thing.
 * @param backgroundKernel  paper-estimate width to search at.
 */
export function autoTune(run, { backgroundKernel = 31 } = {}) {
  const samples = CUTOFFS.map((contrastFloor) => {
    /* Filters wide open: the sweep has to measure what the CUTOFF does, not
       what the size and shape filters do, and splitting would confuse island
       count with egg count. */
    const { detections } = run({
      contrastFloor,
      backgroundKernel,
      minArea: 6,
      maxArea: 1e6,
      maxBlobArea: 1e9,
      minExtent: 0,
      maxAspect: 1e6,
      splitFactor: 1e9,
    })
    const areas = detections.map((d) => d.area).sort((a, b) => a - b)
    return {
      contrastFloor,
      count: detections.length,
      medianArea: areas.length ? areas[areas.length >> 1] : 0,
    }
  })

  /* The step from grain to eggs. Require enough detections on the far side that
     the median is describing a population rather than a handful of survivors. */
  let bestIndex = -1
  let bestRatio = 0
  for (let i = 1; i < samples.length; i++) {
    const prev = samples[i - 1]
    const here = samples[i]
    if (here.count < 12 || prev.medianArea <= 0) continue
    const ratio = here.medianArea / prev.medianArea
    if (ratio > bestRatio) {
      bestRatio = ratio
      bestIndex = i
    }
  }

  /* No step worth the name. Fall back to the middle of the sweep, where the
     count has come down off the grain peak but the cutoff has not yet climbed
     so high that only the darkest eggs survive. This is a starting position for
     the operator's sliders, not an answer — `clean` says which it is. */
  if (bestIndex < 0 || bestRatio < 1.8) {
    const usable = samples.filter((s) => s.count >= 12)
    const fallback = usable[Math.floor(usable.length / 2)] ?? samples[0]
    return {
      clean: false,
      note: 'no clean separation between grain and eggs — marking an egg will do better',
      samples,
      step: bestRatio,
      params: paramsFromArea(
        fallback.medianArea || 100,
        fallback.contrastFloor,
        backgroundKernel,
      ),
      observed: fallback,
    }
  }

  const chosen = samples[bestIndex]
  return {
    clean: true,
    samples,
    step: bestRatio,
    params: paramsFromArea(chosen.medianArea, chosen.contrastFloor, backgroundKernel),
    observed: chosen,
  }
}
