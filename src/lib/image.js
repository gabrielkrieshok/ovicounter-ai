/* Image preparation: crop, coarse rotate, and downscale to one fixed working
   resolution.

   Everything downstream of Crop works on the image this module produces. The
   working resolution is fixed for BOTH the Adjust slider preview and the final
   locked count, because blockSize and minArea are absolute pixel values —
   previewing at one resolution and locking at another would make the count
   jump immediately after the operator finished tuning it. What you tune is
   what you get. */

export const WORKING_LONG_EDGE = 1200

export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.decoding = 'async'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error(`could not load image: ${url}`))
    img.src = url
  })
}

/**
 * The whole photograph as pixels, no larger than `maxLongEdge`.
 *
 * For the jobs that look at the frame rather than the strip — proposing a crop,
 * checking capture quality — where full resolution buys nothing and costs the
 * transfer.
 */
export async function downscaledImageData(srcUrl, maxLongEdge = 600) {
  const img = await loadImage(srcUrl)
  const scale = Math.min(1, maxLongEdge / Math.max(img.naturalWidth, img.naturalHeight))
  const w = Math.max(1, Math.round(img.naturalWidth * scale))
  const h = Math.max(1, Math.round(img.naturalHeight * scale))

  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(img, 0, 0, w, h)
  return ctx.getImageData(0, 0, w, h)
}

/**
 * Rotate the whole photograph by `angleDeg` and return it with the enlarged
 * canvas that contains it.
 *
 * Straightening rotates the PHOTOGRAPH and leaves the crop box axis-aligned,
 * rather than rotating the box over a fixed photograph. Both look identical on
 * screen; only the first keeps corner-dragging simple, because a corner stays a
 * corner instead of becoming a point on a rotated rectangle whose neighbours
 * move when it does.
 *
 * The crop box is therefore normalised against THIS canvas — the rotated
 * bounding box — not against the original photograph.
 */
export function rotatedCanvas(img, angleDeg) {
  const W = img.naturalWidth ?? img.width
  const H = img.naturalHeight ?? img.height
  if (!angleDeg) return { canvas: img, width: W, height: H }

  const rad = (angleDeg * Math.PI) / 180
  const cos = Math.abs(Math.cos(rad))
  const sin = Math.abs(Math.sin(rad))
  const outW = Math.round(W * cos + H * sin)
  const outH = Math.round(W * sin + H * cos)

  const canvas = document.createElement('canvas')
  canvas.width = outW
  canvas.height = outH
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  ctx.imageSmoothingQuality = 'high'
  ctx.translate(outW / 2, outH / 2)
  ctx.rotate(rad)
  ctx.drawImage(img, -W / 2, -H / 2)

  return { canvas, width: outW, height: outH }
}

/**
 * The whole photograph as Crop shows it: straightened by `angleDeg`, then
 * turned by `quarterTurns` × 90° — the same two operations, in the same order,
 * that renderWorkingImage applies, so what the box is drawn over is what the
 * box will cut. Downscaled for the screen; never used for measuring.
 *
 * Before this, Crop showed the original photograph whatever the rotation, so
 * the rotate buttons appeared to do nothing until the marks came back sideways.
 */
export async function cropPreview(srcUrl, angleDeg = 0, quarterTurns = 0, longEdge = 1400) {
  const loaded = await loadImage(srcUrl)
  const { canvas: img, width: W, height: H } = rotatedCanvas(loaded, angleDeg)
  const turns = ((quarterTurns % 4) + 4) % 4
  const swapped = turns === 1 || turns === 3
  const scale = Math.min(1, longEdge / Math.max(W, H))
  const dw = Math.round(W * scale)
  const dh = Math.round(H * scale)
  const canvas = document.createElement('canvas')
  canvas.width = swapped ? dh : dw
  canvas.height = swapped ? dw : dh
  const ctx = canvas.getContext('2d')
  ctx.imageSmoothingQuality = 'high'
  if (turns === 1) {
    ctx.translate(canvas.width, 0)
    ctx.rotate(Math.PI / 2)
  } else if (turns === 2) {
    ctx.translate(canvas.width, canvas.height)
    ctx.rotate(Math.PI)
  } else if (turns === 3) {
    ctx.translate(0, canvas.height)
    ctx.rotate(-Math.PI / 2)
  }
  ctx.drawImage(img, 0, 0, dw, dh)
  return canvas
}

/* The crop box is stored on the straightened photograph, before any quarter
   turn (renderWorkingImage crops first, then turns). Crop draws and drags it on
   the turned preview, so it is carried between the two frames. A clockwise
   quarter turn sends a point (x, y) to (1 − y, x). */
export function boxToTurned(box, quarterTurns) {
  const { l, t, r, b } = box
  switch (((quarterTurns % 4) + 4) % 4) {
    case 1: return { l: 1 - b, t: l, r: 1 - t, b: r }
    case 2: return { l: 1 - r, t: 1 - b, r: 1 - l, b: 1 - t }
    case 3: return { l: t, t: 1 - r, r: b, b: 1 - l }
    default: return { l, t, r, b }
  }
}

export function boxFromTurned(box, quarterTurns) {
  // Turning back is turning forward the rest of the way round.
  return boxToTurned(box, 4 - (((quarterTurns % 4) + 4) % 4))
}

/**
 * Crop to `box` (normalised 0–1 of the straightened source), apply
 * `quarterTurns` × 90°, and scale so the long edge is at most
 * WORKING_LONG_EDGE.
 * Returns { canvas, width, height, scale } — scale being working px per source px.
 */
export async function renderWorkingImage(
  srcUrl,
  box,
  quarterTurns = 0,
  angleDeg = 0,
  /* Overridable only so the dev harness can sweep the resolution floor by
     rendering the same strip at descending sizes. The app always uses the one
     fixed working resolution — see the note above. */
  longEdge = WORKING_LONG_EDGE,
) {
  const loaded = await loadImage(srcUrl)
  const straightened = rotatedCanvas(loaded, angleDeg)
  const img = straightened.canvas
  const W = straightened.width
  const H = straightened.height

  const sx = Math.round(box.l * W)
  const sy = Math.round(box.t * H)
  const cw = Math.max(1, Math.round((box.r - box.l) * W))
  const ch = Math.max(1, Math.round((box.b - box.t) * H))

  const turns = ((quarterTurns % 4) + 4) % 4
  const swapped = turns === 1 || turns === 3

  const sourceLongEdge = Math.max(cw, ch)
  const scale = Math.min(1, longEdge / sourceLongEdge)
  const dw = Math.max(1, Math.round(cw * scale))
  const dh = Math.max(1, Math.round(ch * scale))

  const outW = swapped ? dh : dw
  const outH = swapped ? dw : dh

  const canvas = document.createElement('canvas')
  canvas.width = outW
  canvas.height = outH
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  ctx.imageSmoothingQuality = 'high'

  ctx.save()
  if (turns === 1) {
    ctx.translate(outW, 0)
    ctx.rotate(Math.PI / 2)
  } else if (turns === 2) {
    ctx.translate(outW, outH)
    ctx.rotate(Math.PI)
  } else if (turns === 3) {
    ctx.translate(0, outH)
    ctx.rotate(-Math.PI / 2)
  }
  ctx.drawImage(img, sx, sy, cw, ch, 0, 0, dw, dh)
  ctx.restore()

  return { canvas, width: outW, height: outH, scale }
}

/* An egg has to be meaningfully darker than the paper around it. Ordinary paper
   grain swings only a few grey levels, so this is what separates "an egg" from
   "a slightly dark patch of paper". */
export const MIN_EGG_CONTRAST = 20

/* A blob larger than this fraction of the probe window is a stain, a fold or a
   shadow — not one egg. */
export const MAX_BLOB_FRACTION = 0.25

/**
 * The photograph as one luminance plane, for measuring many blobs at once.
 *
 * `measureBlobAt` reads its own small window straight off the canvas, which is
 * right for one tap. The calibration probe (cv/probe.js) asks the same question
 * at a couple of thousand grid points, and two thousand `getImageData` calls on
 * a 1200px canvas is most of a second on a mid-range phone. Reading the frame
 * once and slicing windows out of it is the same measurement at a fraction of
 * the cost.
 */
export function luminanceFrame(canvas) {
  const width = canvas.width
  const height = canvas.height
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  const { data } = ctx.getImageData(0, 0, width, height)
  return { luma: luminance(data, width * height), width, height }
}

function luminance(rgba, count) {
  const g = new Float32Array(count)
  for (let i = 0, p = 0; i < count; i++, p += 4) {
    g[i] = 0.299 * rgba[p] + 0.587 * rgba[p + 1] + 0.114 * rgba[p + 2]
  }
  return g
}

/** The probe window around a pixel, clipped to the frame. Null if degenerate. */
function windowAround(cx, cy, width, height, windowPx) {
  const half = Math.floor(windowPx / 2)
  const x0 = Math.max(0, cx - half)
  const y0 = Math.max(0, cy - half)
  const x1 = Math.min(width, cx + half + 1)
  const y1 = Math.min(height, cy + half + 1)
  const w = x1 - x0
  const h = y1 - y0
  if (w < 3 || h < 3) return null
  return { x0, y0, w, h }
}

/**
 * Measure the dark blob the operator tapped (Mark one egg).
 *
 * Plain-canvas region growing, no OpenCV — this runs before the pipeline is
 * loaded and only needs one blob.
 *
 * The threshold is a **half maximum keyed to the tapped blob's own contrast**:
 * the background level is taken from the window's upper quantile (paper), the
 * seed is the darkest pixel near the finger, and the cut sits midway between
 * them. That adapts to bright Guatemalan paper and stained Salvadoran paper
 * alike, and — unlike a cut derived from the window mean — it cannot creep down
 * into paper grain, because grain sits near the background level and the cut is
 * always half an egg's depth below it.
 *
 * Returns { wPx, hPx, areaPx, rPx, x, y } — sizes in working pixels, x/y the
 * blob's centre normalised 0–1 — or null when the tap did not land on a single
 * dark speck: too little contrast, or a blob that ran off the window and is
 * therefore a stain rather than an egg.
 *
 * The returned centre is the blob's, not the finger's, so a mark snaps onto the
 * egg the operator meant rather than wherever their thumb landed.
 */
export function measureBlobAt(canvas, nx, ny, windowPx = 61) {
  const cx = Math.round(nx * canvas.width)
  const cy = Math.round(ny * canvas.height)
  const win = windowAround(cx, cy, canvas.width, canvas.height, windowPx)
  if (!win) return null

  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  const { data } = ctx.getImageData(win.x0, win.y0, win.w, win.h)
  const g = luminance(data, win.w * win.h)
  return measureBlobInWindow(g, win, cx, cy, canvas.width, canvas.height)
}

/** The same measurement as `measureBlobAt`, against a frame from `luminanceFrame`. */
export function measureBlobInFrame(frame, nx, ny, windowPx = 61) {
  const cx = Math.round(nx * frame.width)
  const cy = Math.round(ny * frame.height)
  const win = windowAround(cx, cy, frame.width, frame.height, windowPx)
  if (!win) return null

  const g = new Float32Array(win.w * win.h)
  for (let y = 0; y < win.h; y++) {
    const row = (win.y0 + y) * frame.width + win.x0
    g.set(frame.luma.subarray(row, row + win.w), y * win.w)
  }
  return measureBlobInWindow(g, win, cx, cy, frame.width, frame.height)
}

/* `g` is the window's luminance, `win` its placement in a frame of
   `frameW × frameH`, and (cx, cy) the tap in frame pixels. */
function measureBlobInWindow(g, win, cx, cy, frameW, frameH) {
  const { x0, y0, w, h } = win

  // Background = the paper. Take an upper quantile via a 256-bin histogram:
  // paper is the majority of any window, and a quantile ignores the dark tail
  // that the egg itself contributes.
  const hist = new Uint32Array(256)
  for (let i = 0; i < g.length; i++) hist[g[i] | 0]++
  const bgTarget = Math.floor(g.length * 0.7)
  let acc = 0
  let bg = 255
  for (let v = 0; v < 256; v++) {
    acc += hist[v]
    if (acc >= bgTarget) {
      bg = v
      break
    }
  }

  // Seed: darkest pixel within a few px of the tap, so a slightly-off tap
  // still finds the egg.
  const half = Math.floor(Math.max(w, h) / 2)
  const seekR = Math.min(8, half)
  let seed = -1
  let seedVal = Infinity
  for (let y = Math.max(0, cy - y0 - seekR); y < Math.min(h, cy - y0 + seekR + 1); y++) {
    for (let x = Math.max(0, cx - x0 - seekR); x < Math.min(w, cx - x0 + seekR + 1); x++) {
      const i = y * w + x
      if (g[i] < seedVal) {
        seedVal = g[i]
        seed = i
      }
    }
  }
  if (seed < 0) return null

  const contrast = bg - seedVal
  if (contrast < MIN_EGG_CONTRAST) return null // bare paper

  // Half maximum: the blob's edge is where it is half as dark as its centre.
  const cut = seedVal + 0.5 * contrast

  // Region grow (4-connected) over pixels below the cut.
  const seen = new Uint8Array(w * h)
  const stack = [seed]
  seen[seed] = 1
  let minX = w, maxX = 0, minY = h, maxY = 0, area = 0

  while (stack.length) {
    const i = stack.pop()
    const x = i % w
    const y = (i - x) / w
    area++
    if (x < minX) minX = x
    if (x > maxX) maxX = x
    if (y < minY) minY = y
    if (y > maxY) maxY = y

    if (x > 0 && !seen[i - 1] && g[i - 1] < cut) { seen[i - 1] = 1; stack.push(i - 1) }
    if (x < w - 1 && !seen[i + 1] && g[i + 1] < cut) { seen[i + 1] = 1; stack.push(i + 1) }
    if (y > 0 && !seen[i - w] && g[i - w] < cut) { seen[i - w] = 1; stack.push(i - w) }
    if (y < h - 1 && !seen[i + w] && g[i + w] < cut) { seen[i + w] = 1; stack.push(i + w) }
  }

  // Ran off the window, or swallowed a quarter of it: that is a stain, a fold
  // or a shadow, not one egg. Refusing to measure is the honest answer — the
  // screen asks the operator to tap again.
  const clipped = minX === 0 || minY === 0 || maxX === w - 1 || maxY === h - 1
  if (clipped) return null
  if (area > MAX_BLOB_FRACTION * w * h) return null

  /* Local contrast gate. Bare paper is never perfectly flat — a gentle
     illumination gradient across the window is enough for "darkest pixel vs.
     window quantile" to clear the first gate and then region-grow a large,
     soft, entirely imaginary blob. An egg is dark against the paper *directly
     touching it*; a gradient is barely darker than its own surround. So
     re-measure the background from a thin collar around the grown blob and
     require the same contrast against that. */
  const pad = 3
  const bx0 = Math.max(0, minX - pad)
  const bx1 = Math.min(w - 1, maxX + pad)
  const by0 = Math.max(0, minY - pad)
  const by1 = Math.min(h - 1, maxY + pad)
  let collarSum = 0
  let collarN = 0
  for (let y = by0; y <= by1; y++) {
    for (let x = bx0; x <= bx1; x++) {
      const i = y * w + x
      if (seen[i]) continue
      collarSum += g[i]
      collarN++
    }
  }
  const localBg = collarN ? collarSum / collarN : bg
  if (localBg - seedVal < MIN_EGG_CONTRAST) return null

  return {
    wPx: maxX - minX + 1,
    hPx: maxY - minY + 1,
    areaPx: area,
    rPx: Math.sqrt(area / Math.PI),
    /* How much darker the egg is than the paper touching it. This is the number
       the detector's cutoff is derived from (see cv/params.js): measuring it
       here, on this paper under this light, is what lets one pipeline serve a
       near-black egg on a bleached demo strip and a faint sliver on embossed
       Guatemalan quilt paper. */
    contrast: localBg - seedVal,
    x: (x0 + (minX + maxX) / 2) / frameW,
    y: (y0 + (minY + maxY) / 2) / frameH,
  }
}
