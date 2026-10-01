/* The proposal stage.
 *
 * Classical image processing, no learned components. It is tuned for RECALL,
 * not precision: it over-proposes deliberately, because a missed egg costs the
 * operator a search of the whole strip while a false positive costs one tap.
 *
 * Takes `cv` as an argument rather than reading a global, so the same code runs
 * in the worker, in the dev harness, and anywhere else opencv.js is loaded.
 *
 * ---------------------------------------------------------------------------
 * How an egg is separated from paper
 *
 * Two conditions, and the second is the one that is easy to miss. An egg is
 * darker than the paper immediately around it, AND darker by an amount that
 * matters. Ask only the first and blank paper passes: paper grain is always
 * slightly darker than its own neighbourhood somewhere, so a purely local
 * cutoff — an adaptive threshold — keeps half the paper on a clean, evenly-lit
 * strip. That is not a hypothetical; it is what this pipeline did until the
 * buffer was actually looked at, and it buried a few hundred real eggs in a few
 * thousand grains of paper.
 *
 * lib/image.js reached the same conclusion measuring the operator's tapped egg,
 * for the same reason, and guards it the same way. The two agree on purpose.
 *
 * So the paper is estimated first, by morphological closing with a kernel wider
 * than an egg — which erases every dark feature smaller than the kernel and
 * leaves the paper, stains, folds and lighting gradients intact. Subtracting
 * that from the photograph gives, per pixel, how much darker than its own paper
 * it is. A single absolute cutoff on that difference then means the same thing
 * on a bright Guatemalan strip and a stained Salvadoran one, which is exactly
 * what a global cutoff on the raw photograph cannot do.
 *
 * ---------------------------------------------------------------------------
 * What changed from the earlier version
 *
 * The previous pipeline was validated at 0.97 egg recall on the Portugal strips
 * — the proposal step was sound — but four defects downstream made the counts
 * dishonest. All four are fixed here:
 *
 *  1. It never called `connectedComponentsWithStats` or `watershed`, so
 *     touching eggs were one blob and the "split them apart" control had no
 *     parameter to drive. Both are used now.
 *
 *  2. `countPeaksInRegion` counted PIXELS, not peaks. It flagged every pixel
 *     that tied its own dilated maximum, so a flat plateau in the distance
 *     transform inflated a 3-egg clump into dozens. Fixed by running connected
 *     components over the plateau mask, so each plateau contributes exactly one
 *     seed, with the suppression radius set from the calibrated egg size.
 *
 *  3. Nothing ever registered as a clump: the threshold was an absolute
 *     8000px², but a 15px egg is ~175px², so a clump needed ~45 touching eggs
 *     to trip it. It is now relative to the measured median egg area, so it
 *     means the same thing on every paper and every camera.
 *
 *  4. Contours leaked every frame. Under a live slider re-running every 60–80ms
 *     that exhausts the WASM heap mid-session. Every allocation now goes
 *     through a Scope disposed in a `finally`.
 */

/**
 * Propose the crop box: find the paper in the photograph.
 *
 * §4 lists auto-crop as one of the two sensible places for a small learned
 * model, on the grounds that failure is visible and corrected with one drag.
 * That reasoning holds for a classical version too, and a classical version
 * ships today: Otsu's method splits the frame into a bright class and a dark
 * one, the largest bright island is the paper, and its minimum-area rectangle
 * gives both the box and the angle the strip is lying at.
 *
 * It is a proposal, and the screen says so — "Box proposed automatically —
 * drag the corners if it missed." On a photograph that is entirely paper it
 * returns the whole frame, which is the right answer rather than a failure.
 *
 * Takes its own image because it runs BEFORE the working image exists: the crop
 * is what defines the working image.
 */
export function proposeCrop(cv, imageData) {
  const scope = new Scope(cv)
  try {
    const rgba = scope.keep(cv.matFromImageData(imageData))
    const gray = scope.mat()
    cv.cvtColor(rgba, gray, cv.COLOR_RGBA2GRAY)

    /* Blur first: Otsu should split paper from table, and without this the
       eggs — which are a large population of very dark pixels — drag the
       threshold up and split paper from eggs instead. */
    const smooth = scope.mat()
    cv.GaussianBlur(gray, smooth, new cv.Size(21, 21), 0)

    const bright = scope.mat()
    cv.threshold(smooth, bright, 0, 255, cv.THRESH_BINARY + cv.THRESH_OTSU)

    /* Close over the eggs and any dark speckle so the paper is one island. */
    const kernel = scope.keep(
      cv.getStructuringElement(cv.MORPH_ELLIPSE, new cv.Size(25, 25)),
    )
    const solid = scope.mat()
    cv.morphologyEx(bright, solid, cv.MORPH_CLOSE, kernel)

    const labels = scope.mat()
    const stats = scope.mat()
    const centroids = scope.mat()
    const n = cv.connectedComponentsWithStats(solid, labels, stats, centroids, 8, cv.CV_32S)

    const S = 5
    let best = 0
    let bestArea = 0
    for (let i = 1; i < n; i++) {
      const area = stats.data32S[i * S + cv.CC_STAT_AREA]
      if (area > bestArea) {
        bestArea = area
        best = i
      }
    }

    const full = { box: { l: 0, t: 0, r: 1, b: 1 }, angle: 0, found: false }
    if (!best) return full

    const W = imageData.width
    const H = imageData.height
    /* Paper filling almost everything means there is nothing to crop away. Say
       so honestly rather than shaving an arbitrary margin off the edges. */
    if (bestArea > 0.92 * W * H) return { ...full, found: true }

    const x = stats.data32S[best * S + cv.CC_STAT_LEFT]
    const y = stats.data32S[best * S + cv.CC_STAT_TOP]
    const w = stats.data32S[best * S + cv.CC_STAT_WIDTH]
    const h = stats.data32S[best * S + cv.CC_STAT_HEIGHT]

    // The angle the strip is lying at, from the paper island's own rectangle.
    let angle = 0
    const mask = scope.mat()
    mask.create(solid.rows, solid.cols, cv.CV_8UC1)
    const maskData = mask.data
    const labelData = labels.data32S
    for (let i = 0; i < labelData.length; i++) maskData[i] = labelData[i] === best ? 255 : 0

    const contours = scope.keep(new cv.MatVector())
    const hierarchy = scope.mat()
    cv.findContours(mask, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE)
    if (contours.size() > 0) {
      let largest = null
      let largestArea = 0
      for (let i = 0; i < contours.size(); i++) {
        const c = contours.get(i)
        const a = cv.contourArea(c)
        if (a > largestArea) {
          largestArea = a
          largest = c
        }
      }
      if (largest) {
        const rect = cv.minAreaRect(largest)
        let a = rect.angle
        // OpenCV reports the angle in (-90, 0]; fold it to the nearest square.
        if (a < -45) a += 90
        /* Beyond a modest tilt this is a bad fit rather than a tilted strip —
           a quarter-turn is the right correction for that, not a straighten. */
        if (Math.abs(a) <= 15) angle = a
      }
    }

    return {
      box: { l: x / W, t: y / H, r: (x + w) / W, b: (y + h) / H },
      angle,
      found: true,
    }
  } finally {
    scope.dispose()
  }
}

/** Every Mat allocated through a Scope is deleted when the Scope is disposed. */
class Scope {
  constructor(cv) {
    this.cv = cv
    this.items = []
  }
  keep(mat) {
    this.items.push(mat)
    return mat
  }
  mat() {
    return this.keep(new this.cv.Mat())
  }
  dispose() {
    for (const m of this.items) {
      try {
        m.delete()
      } catch {
        /* already deleted */
      }
    }
    this.items.length = 0
  }
}

import { placeInClump } from './place.js'
import { DEFAULT_PARAMS } from './params.js'

export { DEFAULT_PARAMS }

export const STAGES = ['lightDark', 'darkSpecks']

function toOdd(n, lo, hi) {
  let v = Math.round(n)
  if (v % 2 === 0) v += 1
  return Math.min(hi, Math.max(lo, v))
}

export function createPipeline(cv) {
  /* Held across runs. The paper estimate depends only on the photograph and the
     kernel width, not on either slider, so dragging "light / dark split" re-runs
     from the cutoff down and never recomputes the expensive part. */
  let gray = null // 8UC1, contrast-stretched
  let darkness = null // 8UC1, how much darker than its own paper each pixel is
  let darknessKernel = 0 // the kernel `darkness` was built with
  /* The last binary mask, kept so a hand-drawn split can cut the actual pixels
     rather than guess at where two eggs part. One working-resolution 8-bit
     plane, and the clone that keeps it costs well under a millisecond. */
  let mask = null
  let width = 0
  let height = 0

  function release(...mats) {
    for (const m of mats) {
      try {
        m?.delete()
      } catch {
        /* already deleted */
      }
    }
  }

  function dispose() {
    release(gray, darkness, mask)
    gray = null
    darkness = null
    mask = null
    darknessKernel = 0
  }

  /**
   * Load the working image — the cropped, rotated, downscaled frame from
   * lib/image.js. One fixed working resolution for both the slider preview and
   * the final locked count, because `minArea` is an absolute pixel value:
   * previewing at one resolution and locking at another would make the count
   * jump the instant the operator stopped tuning it.
   */
  function setImage(imageData) {
    dispose()
    width = imageData.width
    height = imageData.height

    const scope = new Scope(cv)
    try {
      const rgba = scope.keep(cv.matFromImageData(imageData))
      const g = scope.mat()
      cv.cvtColor(rgba, g, cv.COLOR_RGBA2GRAY)

      gray = new cv.Mat()
      cv.normalize(g, gray, 0, 255, cv.NORM_MINMAX, cv.CV_8U)
    } finally {
      scope.dispose()
    }

    return { width, height }
  }

  /** Estimate the paper and subtract it. Cached; only the kernel width busts it. */
  function ensureDarkness(kernelWidth) {
    if (darkness && darknessKernel === kernelWidth) return

    release(darkness)
    const scope = new Scope(cv)
    try {
      /* Closing erases dark features smaller than the kernel and leaves
         everything larger — so eggs vanish and paper, stains, folds and
         lighting gradients survive. That residue is the paper. */
      const kernel = scope.keep(
        cv.getStructuringElement(cv.MORPH_ELLIPSE, new cv.Size(kernelWidth, kernelWidth)),
      )
      const paper = scope.mat()
      cv.morphologyEx(gray, paper, cv.MORPH_CLOSE, kernel)

      darkness = new cv.Mat()
      cv.subtract(paper, gray, darkness) // saturating: paper itself lands near 0
      darknessKernel = kernelWidth
    } finally {
      scope.dispose()
    }
  }

  /**
   * Run detection.
   *
   * Returns { detections, stats, params }. Detections carry normalised 0–1
   * positions so nothing downstream has to know the working resolution:
   *   { x, y, w, h, area, fromClump }
   *
   * `fromClump` marks an egg separated out of a touching group rather than
   * detected on its own. Clump-derived counts are reported separately from
   * directly detected ones, so the operator can see how much of a total is
   * measured and how much is inferred.
   */
  function run(params = {}, { onStage } = {}) {
    if (!gray) throw new Error('pipeline.run() before setImage()')
    const p = { ...DEFAULT_PARAMS, ...params }
    const kernelWidth = toOdd(p.backgroundKernel, 5, 199)

    ensureDarkness(kernelWidth)

    const scope = new Scope(cv)
    try {
      if (onStage) {
        /* Inverted so it reads as a photograph — paper white, eggs dark — with
           the lighting and staining actually removed. This is the buffer, not a
           filter over the original. */
        const lightDark = scope.mat()
        cv.bitwise_not(darkness, lightDark)
        onStage('lightDark', lightDark)
      }

      // 1. The cutoff. One absolute number, applied to a per-pixel measure of
      //    "darker than my own paper" — local where it needs to be, absolute
      //    where it needs to be.
      const bin = scope.mat()
      cv.threshold(darkness, bin, p.contrastFloor, 255, cv.THRESH_BINARY)

      // 2. Morphological opening — drop single-pixel grain without eating eggs.
      const kernel = scope.keep(
        cv.getStructuringElement(cv.MORPH_ELLIPSE, new cv.Size(3, 3)),
      )
      const opened = scope.mat()
      cv.morphologyEx(bin, opened, cv.MORPH_OPEN, kernel)

      if (onStage) onStage('darkSpecks', opened)

      release(mask)
      mask = opened.clone()

      // 3. Connected components — every dark island, with its area and box.
      const labels = scope.mat()
      const ccStats = scope.mat()
      const centroids = scope.mat()
      const nLabels = cv.connectedComponentsWithStats(
        opened,
        labels,
        ccStats,
        centroids,
        8,
        cv.CV_32S,
      )

      const clumpThreshold = Math.max(p.maxArea, p.splitFactor * p.medianEggArea)

      const singles = []
      const clumpLabels = []
      const statsData = ccStats.data32S
      const S = 5 // stats stride: left, top, width, height, area

      for (let i = 1; i < nLabels; i++) {
        const x = statsData[i * S + cv.CC_STAT_LEFT]
        const y = statsData[i * S + cv.CC_STAT_TOP]
        const w = statsData[i * S + cv.CC_STAT_WIDTH]
        const h = statsData[i * S + cv.CC_STAT_HEIGHT]
        const area = statsData[i * S + cv.CC_STAT_AREA]

        if (area < p.minArea) continue // paper grain
        if (area > p.maxBlobArea) continue // a stain, a fold, the table

        if (area > clumpThreshold) {
          clumpLabels.push(i)
          continue
        }

        if (!passesShape(w, h, area, p)) continue
        singles.push({ x, y, w, h, area, fromClump: false })
      }

      // 4. Split the clumps, and describe each one: where it is, its shape,
      //    and two independent counts — the watershed's and its area's.
      const clumpIndex = new Map(clumpLabels.map((label, i) => [label, i]))
      /* An egg's footprint at THIS cutoff, measured on the eggs that stand
         alone — the same pixels a clump is made of. The calibration's area was
         measured at the tap or probe and can sit well off it (Portugal: 14
         calibrated, 8 alone). Too few singles to trust: the calibration. */
      const singleMedianArea = singles.length >= 20 ? median(singles.map((d) => d.area)) : p.medianEggArea
      const clumps = describeClumps(labels, clumpIndex, statsData, S, { ...p, medianEggArea: singleMedianArea }, width, height)
      const split = clumpLabels.length
        ? splitClumps(cv, opened, labels, clumpLabels, statsData, S, p)
        : { eggs: [] }
      for (const egg of split.eggs) {
        egg.clump = clumpIndex.get(egg.comp)
        clumps[egg.clump].watershed++
      }

      /* A clump the watershed could not cut at all — a dense mat with no
         separable centres — gets as many eggs as its area holds, placed over
         its pixels. Before Oct 2026 these were counted in `inferred` and never
         reached the screen, so the eggs in them were silently lost. */
      const eggR = Math.sqrt(p.medianEggArea / Math.PI)
      const placed = []
      for (const c of clumps) {
        if (c.watershed > 0) continue
        for (const at of placeInClump(c.points, c.byArea, width / height)) {
          placed.push({
            x: at.x * width - eggR,
            y: at.y * height - eggR,
            w: eggR * 2,
            h: eggR * 2,
            area: p.medianEggArea,
            fromClump: true,
            clump: c.id,
            placed: true,
          })
        }
      }

      const detections = [...singles, ...split.eggs, ...placed].map((d) => ({
        x: (d.x + d.w / 2) / width,
        y: (d.y + d.h / 2) / height,
        w: d.w / width,
        h: d.h / height,
        area: d.area,
        fromClump: d.fromClump,
        ...(d.fromClump ? { clump: d.clump } : {}),
        ...(d.placed ? { placed: true } : {}),
      }))

      /* How far the two counts of each clump agree — the measure that decides
         which clumps the person is asked to look at first. */
      const agreement = { same: 0, offByOne: 0, offByTwoPlus: 0, watershedLower: 0 }
      for (const c of clumps) {
        const d = Math.abs(c.byArea - c.watershed)
        if (d === 0) agreement.same++
        else if (d === 1) agreement.offByOne++
        else agreement.offByTwoPlus++
        if (c.watershed < c.byArea) agreement.watershedLower++
      }

      return {
        detections,
        stats: {
          /* Reported separately on purpose: the operator can see how much of a
             total was measured and how much was inferred from clump area. */
          singles: singles.length,
          fromClumps: split.eggs.length,
          clumps: clumps.length,
          inferred: placed.length,
          total: detections.length,
          agreement,
          singleMedianArea,
          totalByArea: singles.length + clumps.reduce((sum, c) => sum + c.byArea, 0),
        },
        clumps,
        params: { ...p, backgroundKernel: kernelWidth },
      }
    } finally {
      scope.dispose()
    }
  }

  /**
   * Split a clump along a stroke the operator drew across it.
   *
   * Dense mats of overlapping eggs are the pipeline's known structural
   * weakness: no watershed variant separates them, which is why the manual
   * split exists at all. So this does not estimate — it cuts the real binary
   * mask along the stroke and re-runs connected components on the piece of the
   * strip that changed. What comes back is measured from pixels, exactly like
   * every other detection, and carries no special status beyond the operator
   * having asked for it.
   *
   * Only the stroke's neighbourhood is recomputed. Re-running the whole strip
   * would also undo every judgment the operator has already made on it.
   */
  function splitAlong(points, params = {}) {
    if (!mask) throw new Error('splitAlong() before run()')
    if (!points || points.length < 2) return { detections: [], region: null }

    const p = { ...DEFAULT_PARAMS, ...params }
    const scope = new Scope(cv)
    try {
      const pixels = points.map((pt) => ({
        x: Math.round(pt.x * width),
        y: Math.round(pt.y * height),
      }))

      const eggRadius = Math.sqrt(p.medianEggArea / Math.PI)
      const pad = Math.max(10, Math.round(eggRadius * 4))

      let minX = Infinity
      let minY = Infinity
      let maxX = -Infinity
      let maxY = -Infinity
      for (const q of pixels) {
        if (q.x < minX) minX = q.x
        if (q.x > maxX) maxX = q.x
        if (q.y < minY) minY = q.y
        if (q.y > maxY) maxY = q.y
      }

      const x0 = Math.max(0, minX - pad)
      const y0 = Math.max(0, minY - pad)
      const x1 = Math.min(width, maxX + pad)
      const y1 = Math.min(height, maxY + pad)
      const w = x1 - x0
      const h = y1 - y0
      if (w < 3 || h < 3) return { detections: [], region: null }

      // `roi` is a view onto the retained mask, so clone before cutting it.
      const view = scope.keep(mask.roi(new cv.Rect(x0, y0, w, h)))
      const cut = scope.keep(view.clone())

      /* Draw the stroke as background. Thin on purpose: it has to part two
         touching eggs without eating either of them. */
      const thickness = Math.max(2, Math.round(eggRadius * 0.5))
      const black = new cv.Scalar(0)
      for (let i = 1; i < pixels.length; i++) {
        const a = new cv.Point(pixels[i - 1].x - x0, pixels[i - 1].y - y0)
        const b = new cv.Point(pixels[i].x - x0, pixels[i].y - y0)
        cv.line(cut, a, b, black, thickness)
      }

      const labels = scope.mat()
      const stats = scope.mat()
      const centroids = scope.mat()
      const n = cv.connectedComponentsWithStats(cut, labels, stats, centroids, 8, cv.CV_32S)

      const S = 5
      const detections = []
      for (let i = 1; i < n; i++) {
        const bx = stats.data32S[i * S + cv.CC_STAT_LEFT]
        const by = stats.data32S[i * S + cv.CC_STAT_TOP]
        const bw = stats.data32S[i * S + cv.CC_STAT_WIDTH]
        const bh = stats.data32S[i * S + cv.CC_STAT_HEIGHT]
        const area = stats.data32S[i * S + cv.CC_STAT_AREA]

        if (area < p.minArea) continue
        /* Looser than a lone egg, for the same reason a watershed piece is: a
           freshly cut egg is flat on the side the stroke went through. */
        const aspect = Math.max(bw, bh) / Math.max(1, Math.min(bw, bh))
        if (aspect > p.maxAspect * 1.6) continue

        detections.push({
          x: (x0 + bx + bw / 2) / width,
          y: (y0 + by + bh / 2) / height,
          w: bw / width,
          h: bh / height,
          area,
          fromClump: true,
        })
      }

      return {
        detections,
        region: { l: x0 / width, t: y0 / height, r: x1 / width, b: y1 / height },
      }
    } finally {
      scope.dispose()
    }
  }

  return {
    setImage,
    run,
    splitAlong,
    dispose,
    get size() {
      return { width, height }
    },
  }
}

/* An egg is a compact oval. A fiber is long and thin; a crease is sparse inside
   its own bounding box. Both share the eggs' darkness, which is why shape has
   to do this work and brightness cannot. */
function passesShape(w, h, area, p) {
  if (area > p.maxArea) return false
  const extent = area / Math.max(1, w * h)
  if (extent < p.minExtent) return false
  const aspect = Math.max(w, h) / Math.max(1, Math.min(w, h))
  return aspect <= p.maxAspect
}

/**
 * Separate touching eggs.
 *
 * The canonical watershed recipe, seeded from distance-transform peaks: the
 * distance transform of a clump peaks once at the centre of each egg in it, so
 * the peaks are the seeds and the watershed lines fall between them.
 *
 * The peak-finding is where the old pipeline went wrong. Comparing the distance
 * transform against its own dilation marks every pixel of a flat plateau, not
 * one peak — so a wide, evenly-round egg centre produced dozens of "peaks".
 * Running connected components over the plateau mask collapses each plateau to
 * a single seed, and the suppression radius comes from the calibrated egg size
 * so two seeds cannot land inside one egg.
 */
function splitClumps(cv, opened, labels, clumpLabels, statsData, S, p) {
  const scope = new Scope(cv)
  try {
    const clumpSet = new Set(clumpLabels)

    const clumpMask = scope.mat()
    clumpMask.create(opened.rows, opened.cols, cv.CV_8UC1)
    const maskData = clumpMask.data
    const labelData = labels.data32S
    for (let i = 0; i < labelData.length; i++) {
      maskData[i] = clumpSet.has(labelData[i]) ? 255 : 0
    }

    // How far each pixel sits from the nearest paper.
    const dist = scope.mat()
    cv.distanceTransform(clumpMask, dist, cv.DIST_L2, 5)

    const radius = Math.max(1, Math.round(p.minDistance))
    const nmsKernel = scope.keep(
      cv.getStructuringElement(
        cv.MORPH_ELLIPSE,
        new cv.Size(radius * 2 + 1, radius * 2 + 1),
      ),
    )
    const dilated = scope.mat()
    cv.dilate(dist, dilated, nmsKernel)

    const distData = dist.data32F
    const dilData = dilated.data32F
    const peakFloor = Math.max(1.0, 0.35 * Math.sqrt(p.medianEggArea / Math.PI))

    const peaks = scope.mat()
    peaks.create(opened.rows, opened.cols, cv.CV_8UC1)
    const peakData = peaks.data
    for (let i = 0; i < distData.length; i++) {
      peakData[i] =
        maskData[i] && distData[i] >= peakFloor && distData[i] >= dilData[i] - 1e-4
          ? 255
          : 0
    }

    // THE fix for defect 2: one plateau is one seed, not one seed per pixel.
    const seeds = scope.mat()
    const seedStats = scope.mat()
    const seedCentroids = scope.mat()
    const nSeeds = cv.connectedComponentsWithStats(
      peaks,
      seeds,
      seedStats,
      seedCentroids,
      8,
      cv.CV_32S,
    )

    if (nSeeds <= 1) return { eggs: [] }

    /* Watershed wants seeds numbered from 2, background 1, unknown 0. */
    const markers = scope.mat()
    seeds.convertTo(markers, cv.CV_32S)
    const markerData = markers.data32S
    for (let i = 0; i < markerData.length; i++) {
      if (markerData[i] > 0) markerData[i] += 1
      else if (!maskData[i]) markerData[i] = 1
      else markerData[i] = 0 // inside the clump but unclaimed — let it flood
    }

    const rgb = scope.mat()
    cv.cvtColor(clumpMask, rgb, cv.COLOR_GRAY2RGB)
    cv.watershed(rgb, markers)

    /* One pass over the flooded markers accumulating per-region geometry —
       cheaper and clearer than asking OpenCV for moments region by region. */
    const acc = new Map()
    const cols = opened.cols
    for (let i = 0; i < markerData.length; i++) {
      const label = markerData[i]
      if (label < 2) continue // background, or a watershed ridge line
      const px = i % cols
      const py = (i - px) / cols
      let r = acc.get(label)
      if (!r) {
        r = { area: 0, minX: px, maxX: px, minY: py, maxY: py, comp: labelData[i] }
        acc.set(label, r)
      }
      r.area++
      if (px < r.minX) r.minX = px
      if (px > r.maxX) r.maxX = px
      if (py < r.minY) r.minY = py
      if (py > r.maxY) r.maxY = py
    }

    const eggs = []
    for (const r of acc.values()) {
      const w = r.maxX - r.minX + 1
      const h = r.maxY - r.minY + 1
      if (r.area < p.minArea) continue
      /* Looser than a lone egg on purpose: a watershed region is cut by its
         neighbours, so it is legitimately less oval than an egg with paper all
         around it. */
      const aspect = Math.max(w, h) / Math.max(1, Math.min(w, h))
      if (aspect > p.maxAspect * 1.6) continue
      eggs.push({ x: r.minX, y: r.minY, w, h, area: r.area, fromClump: true, comp: r.comp })
    }

    return { eggs }
  } finally {
    scope.dispose()
  }
}

/**
 * Each clump as the screens need it: its box, an ellipse round it for drawing,
 * its area, how many eggs that area holds, and a sample of its pixels for
 * placing marks in it. One pass over the label image. Positions are normalised
 * to 0–1; the ellipse's axes are fractions of the image WIDTH, because the
 * image is always scaled uniformly and one unit is enough.
 */
const CLUMP_POINTS = 240

function describeClumps(labels, clumpIndex, statsData, S, p, width, height) {
  const clumps = []
  for (const [label, id] of clumpIndex) {
    const area = statsData[label * S + 4]
    clumps[id] = {
      id,
      x: statsData[label * S + 0] / width,
      y: statsData[label * S + 1] / height,
      w: statsData[label * S + 2] / width,
      h: statsData[label * S + 3] / height,
      area,
      byArea: Math.max(2, Math.round(area / Math.max(1, p.medianEggArea))),
      watershed: 0,
      // moments, filled below
      sx: 0, sy: 0, sxx: 0, syy: 0, sxy: 0, n: 0,
      stride: Math.max(1, Math.ceil(area / CLUMP_POINTS)),
      points: [],
    }
  }
  if (!clumps.length) return clumps

  const labelData = labels.data32S
  for (let i = 0; i < labelData.length; i++) {
    const id = clumpIndex.get(labelData[i])
    if (id === undefined) continue
    const c = clumps[id]
    const px = i % width
    const py = (i - px) / width
    c.sx += px
    c.sy += py
    c.sxx += px * px
    c.syy += py * py
    c.sxy += px * py
    if (c.n % c.stride === 0) c.points.push((px + 0.5) / width, (py + 0.5) / height)
    c.n++
  }

  const pad = Math.sqrt(p.medianEggArea / Math.PI) * 0.6 + 2
  return clumps.map((c) => {
    const mx = c.sx / c.n
    const my = c.sy / c.n
    const vxx = c.sxx / c.n - mx * mx
    const vyy = c.syy / c.n - my * my
    const vxy = c.sxy / c.n - mx * my
    const mid = (vxx + vyy) / 2
    const spread = Math.sqrt(((vxx - vyy) / 2) ** 2 + vxy ** 2)
    // A filled ellipse has variance a²/4 along its axis, so the semi-axis is
    // twice the standard deviation; padded so the outline clears the eggs.
    const a = 2 * Math.sqrt(Math.max(0, mid + spread)) + pad
    const b = 2 * Math.sqrt(Math.max(0, mid - spread)) + pad
    return {
      id: c.id,
      x: c.x,
      y: c.y,
      w: c.w,
      h: c.h,
      area: c.area,
      byArea: c.byArea,
      watershed: c.watershed,
      cx: mx / width,
      cy: my / height,
      rx: a / width,
      ry: b / width,
      angle: 0.5 * Math.atan2(2 * vxy, vxx - vyy),
      points: c.points,
    }
  })
}

function median(values) {
  if (!values.length) return 0
  const v = [...values].sort((a, b) => a - b)
  return v[Math.floor(v.length / 2)]
}
