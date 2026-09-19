/* Pipeline parameters, and the two ways they get set.
 *
 * The parameters that matter are all size- and contrast-dependent, and field
 * imaging varies too much for fixed values to serve every site — paper type,
 * lighting, camera, wetness. Measured across the bundled photographs, an egg on
 * the clean demo strip sits ~200 grey levels below its paper, while a Guatemala
 * egg on embossed quilt paper sits ~40 below and a stained Portugal strip is
 * lower still. A single shipped cutoff cannot serve that range, and no amount
 * of averaging makes one that does.
 *
 * So there are two sources, in order of preference:
 *
 *   1. THE OPERATOR'S TAPPED EGG (seedParamsFromEgg). Measured on that paper,
 *      that camera, that light, once per session. This is the design's primary
 *      path — "Mark one egg" exists for exactly this — and it is the only one
 *      that works on a low-contrast strip.
 *
 *   2. A SEARCH over the cutoff (cv/autotune.js), when nothing has been tapped.
 *      Best effort, and honest about it: on a strip where grain and eggs
 *      overlap in contrast it will not find a clean answer, because there is
 *      not one in the pixels. It proposes; it never refuses. Refusing a
 *      photograph is the capture gate's job, and it decides on egg size in
 *      pixels — the resolution floor — not on the shape of a sweep.
 */

/* Deliberately broad — over-propose, then let the human cull. Only reached when
   nothing has been calibrated and no search has run. */
export const DEFAULT_PARAMS = {
  /* How much darker than its own paper a pixel must be, in 8-bit levels, to
     count as part of an egg. This is the "Light / dark split" slider. */
  contrastFloor: 30,
  /* Width of the kernel that estimates the paper. Must comfortably exceed an
     egg, or an egg contributes to its own background and erases itself. Odd. */
  backgroundKernel: 31,
  /* Smallest thing that can be an egg. This is the "Speck size" slider. */
  minArea: 20,
  /* Largest thing that can be ONE egg. Bigger than this is a clump to split. */
  maxArea: 900,
  /* Bigger than this is a stain, a fold or a shadow — not eggs at all. */
  maxBlobArea: 60000,
  /* area / (w*h). A fiber or a crease is sparse inside its own box. */
  minExtent: 0.32,
  /* Eggs are ovals, not threads. */
  maxAspect: 4.5,
  /* Drives clump splitting and watershed seed spacing. */
  medianEggArea: 150,
  minDistance: 4,
  splitFactor: 1.6,
}

function toOdd(n, lo, hi) {
  let v = Math.round(n)
  if (v % 2 === 0) v += 1
  return Math.min(hi, Math.max(lo, v))
}

/** The size-dependent parameters, all derived from one egg's area. */
export function paramsFromArea(areaPx, contrastFloor, backgroundKernel) {
  const radius = Math.sqrt(areaPx / Math.PI)
  return {
    contrastFloor: Math.max(6, Math.min(220, Math.round(contrastFloor))),
    /* Six radii — three egg diameters — leaves room for the elongated ones.
       Too small and an egg helps estimate its own background, erasing itself. */
    backgroundKernel: toOdd(backgroundKernel ?? radius * 6, 9, 99),
    medianEggArea: Math.round(areaPx),
    /* Generous on the low side: over-propose, then let the human cull. */
    minArea: Math.max(4, Math.round(areaPx * 0.35)),
    /* Above this is a clump, not one egg. */
    maxArea: Math.round(areaPx * 2.2),
    /* Watershed seeds must sit about an egg radius apart, or one egg splits
       into several. */
    minDistance: Math.max(2, Math.round(radius)),
  }
}

/**
 * Seed the pipeline from the egg the operator marked.
 *
 * `measured` comes from lib/image.js `measureBlobAt` — the same measurement the
 * "Mark one egg" screen makes when a finger lands on an egg.
 *
 * The cutoff is half the egg's measured contrast, and that factor is not a
 * guess. `measureBlobAt` defines the egg's extent by growing it out to a HALF
 * MAXIMUM of its own contrast, so the area it reports is the area at that cut.
 * Cutting the pipeline at the same place reproduces the same body — the
 * detector and the measurement agree on where an egg ends, which is what makes
 * `medianEggArea` mean anything downstream.
 */
export function seedParamsFromEgg({ areaPx, rPx, contrast }) {
  return paramsFromArea(areaPx, contrast * 0.5, rPx * 6)
}
